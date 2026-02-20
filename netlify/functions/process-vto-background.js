const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// --- 1. ENTERPRISE INITIALIZATION ---
if (!admin.apps.length) {
    try {
        // Parse the entire JSON object from one variable
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        // The only fix needed: convert literal \n strings to real newlines
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "kingsleystoreai.firebasestorage.app"
        });

        console.log("✅ Firebase initialized successfully.");
    } catch (error) {
        console.error("🔥 Firebase Init Error:", error.message);
        // We don't throw here to prevent the whole function from crashing before logging
    }
}

exports.handler = async (event) => {
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const result = await model.generateContent([
            `Task: Photo-realistic try-on. Wear ${clothName}. Return ONLY raw base64 jpeg.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const aiOutput = result.response.text();
        if (!aiOutput || aiOutput.length < 500) throw new Error("AI_EMPTY");

        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, 'base64');
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl
        });

        console.log("🚀 SUCCESS: Render live.");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("❌ ERROR:", error.message);
        await db.collection("vto_jobs").doc(jobId).set({ status: "failed", error: error.message }, { merge: true });
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};