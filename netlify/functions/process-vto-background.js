const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleAuth } = require('google-auth-library');

// 1. SECURE INITIALIZATION
const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount;
if (rawEnv) {
    try {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    } catch (e) {
        console.error("❌ ERROR: Service Account JSON is malformed.");
    }
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
    });
}

exports.handler = async (event) => {
    // Add CORS headers so the browser doesn't block the response
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    const { jobId, userImage, clothImage } = JSON.parse(event.body);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    try {
        await db.collection("vto_jobs").doc(jobId).set({ status: "processing" }, { merge: true });

        // 2. AUTHENTICATION
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 3. THE OFFICIAL VTO ENDPOINT
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // CORRECT PAYLOAD STRUCTURE FOR VTO-001
        const requestBody = {
            instances: [{
                personImage: { image: { bytesBase64Encoded: userImage } },
                productImage: { image: { bytesBase64Encoded: clothImage } }
            }],
            parameters: {
                sampleCount: 1,
                addWatermark: false
            }
        };

        console.log("📡 Sending request to Vertex AI...");
        const response = await axios.post(url, requestBody, {
            headers: { 
                Authorization: `Bearer ${token.token}`, 
                'Content-Type': 'application/json' 
            }
        });

        // 4. DATA EXTRACTION
        const prediction = response.data.predictions[0];
        if (!prediction || !prediction.bytesBase64Encoded) {
            throw new Error("AI model returned no image data.");
        }

        const buffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
            metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" },
            public: true,
            resumable: false
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl
        });

        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ success: true, url: publicUrl }) 
        };

    } catch (error) {
        // Detailed error logging for Netlify
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error("❌ VTO CRASH:", errorMsg);

        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: errorMsg 
        }, { merge: true });

        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: errorMsg }) 
        };
    }
};