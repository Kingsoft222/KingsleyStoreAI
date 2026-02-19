const axios = require("axios");
const admin = require("firebase-admin");

const initializeFirebase = () => {
    if (admin.apps.length === 0) {
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
            console.log("SYSTEM: Firebase Initialized Successfully");
        } catch (error) {
            console.error("CRITICAL: Firebase Init Failed:", error.message);
            throw error;
        }
    }
};

exports.handler = async (event) => {
    initializeFirebase();
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const jobRef = db.collection("vto_jobs").doc(jobId);
        await jobRef.set({ status: "processing" }, { merge: true });

        // --- THE CORRECT PRODUCTION URL ---
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await axios.post(url, {
            contents: [{
                parts: [
                    { text: `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }]
        }, { timeout: 90000 });

        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("AI response format invalid");
        }

        let aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("SUCCESS: Image rendered and folder created.");

    } catch (error) {
        console.error("FINAL ERROR LOG:", error.message);
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};