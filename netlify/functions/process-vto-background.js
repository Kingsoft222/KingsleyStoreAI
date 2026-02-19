const axios = require("axios");
const admin = require("firebase-admin");

// --- 1. ROBUST INITIALIZATION ---
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
    // Force init at the start of every invocation
    initializeFirebase();
    
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const jobRef = db.collection("vto_jobs").doc(jobId);

        // Update status to processing
        await jobRef.set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Call Gemini
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
            { timeout: 110000 }
        );

        const aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        // Save to Storage
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        // Success Update
        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error("HANDLER ERROR:", error.message);
        // Attempt to log failure if possible
        try {
            await db.collection("vto_jobs").doc(jobId).set({ 
                status: "failed", 
                error: error.message 
            }, { merge: true });
        } catch (e) { /* ignore secondary error */ }
    }
};