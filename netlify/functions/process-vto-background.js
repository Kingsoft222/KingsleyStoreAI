const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// --- 1. FIREBASE INITIALIZATION ---
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
            console.log("SYSTEM: Firebase Ready for Saturday");
        } catch (error) {
            console.error("Firebase Init Error:", error.message);
        }
    }
};

exports.handler = async (event) => {
    initializeFirebase();
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    // Parse incoming data
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        const jobRef = db.collection("vto_jobs").doc(jobId);
        await jobRef.set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // --- 2. MULTI-MODEL FALLBACK LOGIC ---
        // We start with the most likely to work, then move to fallbacks
        const modelNames = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro-vision"];
        let result = null;
        let lastError = null;

        for (const modelName of modelNames) {
            try {
                console.log(`ATTEMPTING: ${modelName} for Job: ${jobId}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                result = await model.generateContent([
                    `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown.`,
                    { inlineData: { mimeType: "image/jpeg", data: userImage } }
                ]);
                
                if (result) break; // If successful, exit the loop
            } catch (err) {
                console.warn(`Model ${modelName} failed: ${err.message}`);
                lastError = err;
            }
        }

        if (!result) throw lastError;

        const aiOutput = result.response.text();
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        // --- 3. SAVE TO STORAGE ---
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true 
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        // --- 4. SUCCESS UPDATE ---
        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("SUCCESS: Image generated and stored.");

    } catch (error) {
        console.error("FINAL SDK ERROR:", error.message);
        
        try {
            await db.collection("vto_jobs").doc(jobId).set({ 
                status: "failed", 
                error: `Final attempt failed: ${error.message}` 
            }, { merge: true });
        } catch (e) { console.error("Could not log failure:", e.message); }
    }
};