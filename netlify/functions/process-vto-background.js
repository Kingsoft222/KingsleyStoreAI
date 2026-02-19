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
            }),
            storageBucket: "kingsleystoreai.firebasestorage.app"
        });
    } catch (error) {
        console.error("Auth Error:", error.message);
    }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

exports.handler = async (event) => {
    // Background functions don't need to return a body to the user immediately
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        // 1. Mark as Processing
        await db.collection("vto_jobs").doc(jobId).update({ status: "processing" });

        // 2. Call Gemini
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `FASHION AI: Put this person in a ${clothName}. Return ONLY the image data.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 120000 } // 2 minute internal timeout
        );

        // 3. Extract and Clean
        let aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        // 4. UPLOAD TO STORAGE (This avoids the 1MB Firestore limit)
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        // 5. Update Firestore with the LINK, not the whole image
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("SUCCESS: Image stored and job updated.");
    } catch (error) {
        console.error("Process Failed:", error.message);
        await db.collection("vto_jobs").doc(jobId).update({ status: "failed", error: error.message });
    }
};