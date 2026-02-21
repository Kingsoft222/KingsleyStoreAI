const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleAuth } = require('google-auth-library');

const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = rawEnv ? JSON.parse(rawEnv) : null;
if (serviceAccount) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

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

    // CLEAN AND VALIDATE
    const cleanUser = userImage.includes(',') ? userImage.split(',')[1] : userImage;
    const cleanCloth = clothImage.includes(',') ? clothImage.split(',')[1] : clothImage;

    // IF LENGTH IS UNDER 1000 CHARACTERS, IT IS NOT A VALID IMAGE
    if (cleanUser.length < 1000 || cleanCloth.length < 1000) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: "Invalid image data. The file might be missing on the server." }) 
        };
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
                personImage: { image: { bytesBase64Encoded: cleanUser.trim() } },
                productImages: [{ image: { bytesBase64Encoded: cleanCloth.trim() } }]
            }],
            parameters: { sampleCount: 1, addWatermark: false }
        };

        const response = await axios.post(url, requestBody, {
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }
        });

        const prediction = response.data.predictions[0];
        if (!prediction || !prediction.bytesBase64Encoded) throw new Error("AI returned empty result");

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
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error("VTO_CRASH_DETAIL:", errorMsg);
        await db.collection("vto_jobs").doc(jobId).set({ status: "failed", error: errorMsg }, { merge: true });
        return { statusCode: 500, body: JSON.stringify({ error: errorMsg }) };
    }
};