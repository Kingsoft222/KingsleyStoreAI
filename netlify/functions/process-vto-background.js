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

        // --- FIXED URL & MODEL VERSION ---
        // We use v1 instead of v1beta for maximum stability
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await axios.post(url, {
            contents: [{
                parts: [
                    { text: `You are a fashion AI. Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown, no extra text.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }]
        }, { 
            timeout: 90000,
            headers: { 'Content-Type': 'application/json' }
        });

        // Add extra check to see what Gemini actually sent back
        if (!response.data || !response.data.candidates) {
            throw new Error("Gemini returned empty response");
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

        console.log("SUCCESS: Image generated and stored.");

    } catch (error) {
        // Detailed logging to find exactly what failed
        console.error("HANDLER ERROR TYPE:", error.response ? "API Error" : "Logic Error");
        console.error("ERROR MESSAGE:", error.message);
        if (error.response) console.error("API DATA:", JSON.stringify(error.response.data));

        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};