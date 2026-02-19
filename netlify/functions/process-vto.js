const axios = require("axios");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // THE SURGERY:
        // 1. Replace literal "\n" strings with actual newlines
        // 2. Remove any accidental surrounding quotes
        const formattedKey = rawKey
            .replace(/\\n/g, '\n')
            .replace(/"/g, '')
            .trim();

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "kingsleystoreai",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: formattedKey
            })
        });
        console.log("SUCCESS: Firebase Admin Initialized");
    } catch (error) {
        console.error("FATAL: Firebase Admin Init Failed:", error.message);
    }
}

const db = admin.firestore();

exports.handler = async (event) => {
    const headers = { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, clothName, jobId } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;

        // Call Gemini
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `FASHION AI: Replace clothing with ${clothName}. Return ONLY base64.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 55000 }
        );

        const aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/[^A-Za-z0-9+/=]/g, ""); 
        const finalUrl = `data:image/jpeg;base64,${cleanBase64}`;

        // UPDATE FIRESTORE
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: finalUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { statusCode: 200, headers, body: JSON.stringify({ status: "success" }) };

    } catch (error) {
        console.error("AI/DB Error:", error.message);
        return { statusCode: 500, headers, body: error.message };
    }
};