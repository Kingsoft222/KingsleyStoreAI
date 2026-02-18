const axios = require("axios");
const admin = require("firebase-admin");

// God Mode Initialization using Netlify Environment Variables
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "kingsleystoreai", 
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // The fix for the 4KB / Newline issue:
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

exports.handler = async (event) => {
    const headers = { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "Content-Type" 
    };

    try {
        const { userImage, clothName, jobId } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;

        // 1. Call Gemini to stitch the clothes
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `FASHION AI: Perform a virtual try-on. Keep the person's face and background from the source image. Replace their clothes with ${clothName}. Return ONLY the base64 jpeg string.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            }
        );

        const aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/[^A-Za-z0-9+/=]/g, ""); 
        const finalUrl = `data:image/jpeg;base64,${cleanBase64}`;

        // 2. WIRING: Update the Firestore doc so the app "pops" the image
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: finalUrl
        });

        return { statusCode: 200, headers, body: "Background stitching complete!" };

    } catch (error) {
        console.error("Tailor Error:", error.message);
        return { statusCode: 500, headers, body: error.message };
    }
};