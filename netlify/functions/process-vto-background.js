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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Using gemini-2.0-flash-preview-image-generation for more stable image output in 2026
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });

    try {
        const jobRef = admin.firestore().collection("vto_jobs").doc(jobId);
        await jobRef.set({ status: "processing" }, { merge: true });

        // Force explicit base64 instruction to prevent empty text
        const result = await model.generateContent([
            `Task: Wear ${clothName}. Return ONLY the base64 jpeg string. No words.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const response = await result.response;
        const aiOutput = response.text();

        // THE DATA GUARD: Prevents 0kb/broken images
        if (!aiOutput || aiOutput.length < 500) {
            throw new Error("AI returned empty or insufficient data. Safety filter likely blocked output.");
        }

        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = admin.storage().bucket().file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/kingsleystoreai.firebasestorage.app/o/${encodeURIComponent('results/' + jobId + '.jpg')}?alt=media`;

        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl
        });

        console.log("SUCCESS: Image generated with real data!");

    } catch (error) {
        console.error("FINAL ERROR:", error.message);
        await admin.firestore().collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};