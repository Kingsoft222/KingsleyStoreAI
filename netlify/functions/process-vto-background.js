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
        console.log("SYSTEM: Background Auth Success");
    } catch (error) {
        console.error("Auth Error:", error.message);
    }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

exports.handler = async (event) => {
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        // 1. Mark as Processing
        await db.collection("vto_jobs").doc(jobId).update({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Call Gemini
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

        // 3. Upload to Firebase Storage
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        // 4. Update Firestore with URL
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`SUCCESS: Job ${jobId} uploaded to storage.`);
    } catch (error) {
        console.error("FAIL:", error.message);
        await db.collection("vto_jobs").doc(jobId).update({ 
            status: "failed", 
            error: error.message 
        });
    }
};