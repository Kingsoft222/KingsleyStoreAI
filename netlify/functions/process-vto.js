const axios = require("axios");
const admin = require("firebase-admin");

// Initialize Firebase Admin with extra safety for the Private Key
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY 
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
            : undefined;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "kingsleystoreai",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
        console.log("Firebase Admin Initialized");
    } catch (initError) {
        console.error("Firebase Admin Init Failed:", initError.message);
    }
}

const db = admin.firestore();

exports.handler = async (event) => {
    // Standard CORS headers
    const headers = { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Handle Preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    try {
        const body = JSON.parse(event.body);
        const { userImage, clothName, jobId } = body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!jobId) throw new Error("Missing Job ID");

        // 1. Call Gemini with a 50-second timeout to prevent early spooling
        console.log(`Starting AI Stitch for Job: ${jobId}`);
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `FASHION AI: Perform a virtual try-on. Replace the clothes with ${clothName}. Keep the person's face and background identical. Return ONLY the base64 string.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 50000 } 
        );

        // Extract and clean the base64
        const aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/[^A-Za-z0-9+/=]/g, ""); 
        const finalUrl = `data:image/jpeg;base64,${cleanBase64}`;

        // 2. Update Firestore directly
        console.log(`Updating Firestore for Job: ${jobId}`);
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: finalUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ status: "success", jobId: jobId }) 
        };

    } catch (error) {
        console.error("Tailor Error:", error.message);
        
        // If we have a jobId, try to log the failure to Firebase so the UI stops spinning
        try {
            const body = JSON.parse(event.body);
            if (body.jobId) {
                await db.collection("vto_jobs").doc(body.jobId).update({
                    status: "failed",
                    errorDetails: error.message
                });
            }
        } catch (dbErr) {
            console.error("Could not log error to Firestore");
        }

        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};