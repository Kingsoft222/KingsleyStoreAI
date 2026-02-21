const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleAuth } = require('google-auth-library');

const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;

try {
    if (rawEnv) {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
} catch (e) {
    console.error("CRITICAL: Failed to parse Service Account ENV:", e.message);
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "kingsleystoreai.firebasestorage.app"
    });
}

exports.handler = async (event) => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const { jobId, userImage, clothImage } = JSON.parse(event.body);

    // DEEP LOGGING
    console.log(`Starting VTO Job: ${jobId}`);
    console.log(`User Image Length: ${userImage?.length || 0}`);
    console.log(`Cloth Image Length: ${clothImage?.length || 0}`);

    if (!serviceAccount) {
        return { statusCode: 500, body: JSON.stringify({ error: "Service Account not configured in Netlify." }) };
    }

    try {
        await db.collection("vto_jobs").doc(jobId).set({ status: "processing" }, { merge: true });

        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        const requestBody = {
            instances: [{
                personImage: { image: { bytesBase64Encoded: userImage } },
                productImages: [{ image: { bytesBase64Encoded: clothImage } }]
            }],
            parameters: { sampleCount: 1, addWatermark: false }
        };

        console.log("Sending request to Vertex AI...");
        const response = await axios.post(url, requestBody, {
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }
        });

        const prediction = response.data.predictions[0];
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);
        
        await file.save(Buffer.from(prediction.bytesBase64Encoded, "base64"), {
            metadata: { contentType: "image/jpeg" },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        await db.collection("vto_jobs").doc(jobId).update({ status: "completed", resultImageUrl: publicUrl });

        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        // THIS IS THE MOST IMPORTANT PART: It logs the REAL error from Google
        const apiError = error.response?.data?.[0]?.error?.message || error.response?.data?.error?.message || error.message;
        console.error("VERTEX AI ERROR DETAIL:", apiError);
        
        await db.collection("vto_jobs").doc(jobId).set({ status: "failed", error: apiError }, { merge: true });
        return { statusCode: 500, body: JSON.stringify({ error: apiError }) };
    }
};