const axios = require("axios");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;
        const cleanKey = rawKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\\n|\s/g, "");
        const finalKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "kingsleystoreai",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: finalKey
            })
        });
        console.log("LOG: Firebase Authenticated Successfully.");
    } catch (error) {
        console.error("LOG: Authentication Failed:", error.message);
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

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `FASHION AI: Perform a virtual try-on. Replace the clothes with ${clothName}. Keep the person's face and background identical. Return ONLY the raw base64 data string. Do not use markdown. Do not use code blocks.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 55000 }
        );

        let aiOutput = response.data.candidates[0].content.parts[0].text;

        // THE CLEANER: Strip Markdown backticks, "base64" labels, and newlines
        const cleanBase64 = aiOutput
            .replace(/```[a-z]*\n?/g, "") // Removes ```base64 or ```
            .replace(/```/g, "")           // Removes closing ```
            .replace(/\s/g, "")            // Removes all whitespace/newlines
            .trim();

        const finalUrl = `data:image/jpeg;base64,${cleanBase64}`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: finalUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("LOG: Image sanitized and saved to Firestore.");
        return { statusCode: 200, headers, body: JSON.stringify({ status: "success" }) };

    } catch (error) {
        console.error("Tailor Error:", error.message);
        return { statusCode: 500, headers, body: error.message };
    }
};