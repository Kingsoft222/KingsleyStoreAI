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
        console.error("Firebase Init Error:", error.message);
    }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

exports.handler = async (event) => {
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        // Step 1: Status Processing
        await db.collection("vto_jobs").doc(jobId).update({ status: "processing" });

        // Step 2: Call Gemini
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 120000 }
        );

        let aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        // Step 3: Save to Storage (No 1MB Limit)
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        // Step 4: Update Firestore with URL
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error("Process Error:", error.message);
        await db.collection("vto_jobs").doc(jobId).update({ status: "failed", error: error.message });
    }
};