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
        console.log("LOG: Firebase Authenticated.");
    } catch (error) {
        console.error("LOG: Auth Error:", error.message);
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
                        { text: `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown, no backticks, no text.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 55000 }
        );

        let aiOutput = response.data.candidates[0].content.parts[0].text;

        // STRIP MARKDOWN (The "Broken Image" Killer)
        const cleanBase64 = aiOutput
            .replace(/```[a-z]*\n?/gi, "") 
            .replace(/```/g, "")           
            .replace(/\s/g, "")            
            .trim();

        // SIZE CHECK (Firestore Limit is ~1MB)
        const sizeInBytes = (cleanBase64.length * 3) / 4;
        if (sizeInBytes > 1000000) {
            throw new Error("AI Result too large for database.");
        }

        const finalUrl = `data:image/jpeg;base64,${cleanBase64}`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: finalUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { statusCode: 200, headers, body: JSON.stringify({ status: "success" }) };

    } catch (error) {
        console.error("Tailor Error:", error.message);
        return { statusCode: 500, headers, body: error.message };
    }
};