const { GoogleGenerativeAI } = require("@google/generative-ai");
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
            console.log("SYSTEM: Firebase Ready for Saturday");
        } catch (error) { console.error("Firebase Init Error:", error.message); }
    }
};

exports.handler = async (event) => {
    initializeFirebase();
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    
    // UPDATED FOR 2026: Switching to gemini-2.5-flash to kill the 404
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const jobRef = admin.firestore().collection("vto_jobs").doc(jobId);
        await jobRef.set({ status: "processing" }, { merge: true });

        const result = await model.generateContent([
            `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const aiOutput = result.response.text();
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = admin.storage().bucket().file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        await jobRef.update({
            status: "completed",
            resultImageUrl: `https://storage.googleapis.com/${admin.storage().bucket().name}/results/${jobId}.jpg`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("SUCCESS: Ankara render created with Gemini 2.5!");

    } catch (error) {
        console.error("SATURDAY ERROR:", error.message);
        await admin.firestore().collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};