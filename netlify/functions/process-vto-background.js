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
        } catch (error) { console.error("Firebase Init Error:", error.message); }
    }
};

exports.handler = async (event) => {
    initializeFirebase();
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 2026 MANDATORY MODEL: Switching to gemini-3.0-flash
    const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

    try {
        const jobRef = admin.firestore().collection("vto_jobs").doc(jobId);
        await jobRef.set({ status: "processing" }, { merge: true });

        const result = await model.generateContent([
            `Task: Photo-realistic render of this person wearing ${clothName}. Return ONLY the base64 jpeg string.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const response = await result.response;
        const aiOutput = response.text();

        if (!aiOutput || aiOutput.length < 500) {
            throw new Error("EMPTY_RESPONSE: AI failed to produce image data.");
        }

        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = admin.storage().bucket().file(`results/${jobId}.jpg`);
        
        await file.save(buffer, { metadata: { contentType: 'image/jpeg' }, public: true });

        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/kingsleystoreai.firebasestorage.app/o/${encodeURIComponent('results/' + jobId + '.jpg')}?alt=media`;

        await jobRef.update({ status: "completed", resultImageUrl: publicUrl });
        console.log("SUCCESS: Gemini 3.0 Render Complete.");

    } catch (error) {
        console.error("CRITICAL ERROR:", error.message);
        // This is our insurance policy: it will log the actual supported models if we fail again
        await admin.firestore().collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};