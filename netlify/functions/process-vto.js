const axios = require("axios");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    try {
        // Step 1: Grab the Base64 string from your Netlify Environment Variable
        const base64Key = process.env.FIREBASE_PRIVATE_KEY;
        
        // Step 2: Decode it into the original PEM format
        const decodedKey = Buffer.from(base64Key, 'base64').toString('utf8');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "kingsleystoreai",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: decodedKey
            })
        });
        console.log("SUCCESS: Firebase Admin Initialized via Base64 Bridge");
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

        console.log(`Processing AI request for Job: ${jobId}`);

        // Call Gemini AI
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `FASHION AI: Perform a virtual try-on. Replace the clothes with ${clothName}. Keep the person's face and background identical. Return ONLY the base64 jpeg string.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 55000 }
        );

        const aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/[^A-Za-z0-9+/=]/g, ""); 
        const finalUrl = `data:image/jpeg;base64,${cleanBase64}`;

        // Update Firestore
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: finalUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Job ${jobId} successfully updated in Firestore.`);
        return { statusCode: 200, headers, body: JSON.stringify({ status: "success" }) };

    } catch (error) {
        console.error("Tailor Error:", error.message);
        return { statusCode: 500, headers, body: error.message };
    }
};