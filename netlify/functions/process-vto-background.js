/**
 * Kingsley Store AI - Background VTO Processor
 * This function handles the heavy lifting of talking to Google Vertex AI.
 */

// 1. IMMEDIATE LOGGING (This proves the function is alive)
console.log("--- [VTO] FUNCTION INVOKED AT:", new Date().toISOString(), "---");

const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleAuth } = require('google-auth-library');

// 2. INITIALIZE FIREBASE (with safety check)
const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;

try {
    if (rawEnv) {
        serviceAccount = JSON.parse(rawEnv);
        // Fix formatting for private keys with newlines
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        console.log("--- [VTO] Service Account Parsed Successfully ---");
    } else {
        console.error("--- [VTO] ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is MISSING ---");
    }
} catch (e) {
    console.error("--- [VTO] CRITICAL ERROR: Could not parse Service Account JSON:", e.message);
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "kingsleystoreai.firebasestorage.app"
    });
}

exports.handler = async (event) => {
    // Netlify Background Functions must return a 202 quickly
    // but we wrap the logic to ensure we catch errors.
    
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    try {
        const body = JSON.parse(event.body);
        const { jobId, userImage, clothImage } = body;

        console.log(`--- [VTO] Processing Job ID: ${jobId} ---`);
        console.log(`--- [VTO] User Image Size: ${userImage?.length || 0} characters ---`);
        console.log(`--- [VTO] Cloth Image Size: ${clothImage?.length || 0} characters ---`);

        if (!serviceAccount) throw new Error("Backend authentication missing.");

        // Mark Firestore as processing
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 3. GET GOOGLE AUTH TOKEN
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 4. CALL VERTEX AI VIRTUAL TRY-ON
        const region = "us-central1"; // VTO is currently stable here
        const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/${region}/publishers/google/models/virtual-try-on-001:predict`;

        const requestBody = {
            instances: [{
                personImage: { image: { bytesBase64Encoded: userImage } },
                productImages: [{ image: { bytesBase64Encoded: clothImage } }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false 
            }
        };

        console.log("--- [VTO] Sending Request to Google Vertex AI... ---");
        
        const response = await axios.post(url, requestBody, {
            headers: { 
                Authorization: `Bearer ${token.token}`, 
                'Content-Type': 'application/json' 
            }
        });

        // 5. PROCESS RESPONSE
        const prediction = response.data.predictions[0];
        if (!prediction || !prediction.bytesBase64Encoded) {
            throw new Error("Google AI returned an empty prediction.");
        }

        console.log("--- [VTO] Success! Saving Result to Storage... ---");

        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);
        
        await file.save(Buffer.from(prediction.bytesBase64Encoded, "base64"), {
            metadata: { contentType: "image/jpeg" },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        
        // Final update to Firestore
        await db.collection("vto_jobs").doc(jobId).update({ 
            status: "completed", 
            resultImageUrl: publicUrl,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("--- [VTO] Job Complete. Result:", publicUrl, "---");
        return { statusCode: 200, body: "Success" };

    } catch (error) {
        // CATCH-ALL ERROR LOGGING
        const apiError = error.response?.data?.error?.message || error.response?.data?.[0]?.error?.message || error.message;
        console.error("--- [VTO] CRASH REPORT ---");
        console.error("Error Message:", apiError);
        if (error.response?.data) console.error("Full Data:", JSON.stringify(error.response.data));

        // Attempt to report failure back to user via Firestore
        try {
            const body = JSON.parse(event.body);
            await db.collection("vto_jobs").doc(body.jobId).set({ 
                status: "failed", 
                error: apiError 
            }, { merge: true });
        } catch (dbError) {
            console.error("--- [VTO] Could not even update Firestore failure status ---");
        }

        return { statusCode: 500, body: JSON.stringify({ error: apiError }) };
    }
};