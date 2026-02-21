import admin from "firebase-admin";
import axios from "axios";
import { GoogleAuth } from 'google-auth-library';

console.log("--- [VTO] ENGINE STARTING ---");

// Initialize Firebase
const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;

try {
    if (rawEnv) {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
} catch (e) {
    console.error("!!! CONFIG ERROR:", e.message);
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "kingsleystoreai.firebasestorage.app"
    });
}

export const handler = async (event) => {
    console.log("--- [VTO] REQUEST RECEIVED ---");
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    try {
        const { jobId, userImage, clothImage } = JSON.parse(event.body);
        
        if (!serviceAccount) throw new Error("Service account missing in environment.");

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

        const prediction = response.data.predictions[0];
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);
        
        await file.save(Buffer.from(prediction.bytesBase64Encoded, "base64"), {
            metadata: { contentType: "image/jpeg" },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        await db.collection("vto_jobs").doc(jobId).update({ status: "completed", resultImageUrl: publicUrl });

        console.log("--- [VTO] SUCCESS: ", publicUrl);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error("--- [VTO] CRASH:", msg);
        return { statusCode: 500, body: JSON.stringify({ error: msg }) };
    }
};