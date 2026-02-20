const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleAuth } = require('google-auth-library');

const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = rawEnv ? JSON.parse(rawEnv) : null;
if (serviceAccount) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
    });
}

exports.handler = async (event) => {
    const { jobId, userImage, clothImage } = JSON.parse(event.body);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

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

        const response = await axios.post(url, requestBody, {
            headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' }
        });

        // Extract bytes from prediction
        const base64Output = response.data.predictions[0].bytesBase64Encoded;
        const buffer = Buffer.from(base64Output, "base64");
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);

        await file.save(buffer, { metadata: { contentType: "image/jpeg" }, public: true, resumable: false });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        await db.collection("vto_jobs").doc(jobId).update({ status: "completed", resultImageUrl: publicUrl });

        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("VTO ERROR:", error.response?.data || error.message);
        await db.collection("vto_jobs").doc(jobId).set({ status: "failed", error: error.message }, { merge: true });
        return { statusCode: 500 };
    }
};