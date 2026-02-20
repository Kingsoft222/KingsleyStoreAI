const axios = require("axios");
const admin = require("firebase-admin");

// --- 1. ENTERPRISE FIREBASE INIT ---
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "kingsleystoreai.firebasestorage.app"
        });
        console.log("✅ Firebase initialized.");
    } catch (error) {
        console.error("🔥 Firebase Init Error:", error.message);
    }
}

exports.handler = async (event) => {
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    try {
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // --- 2. STABLE V1 API CALL ---
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{
                parts: [
                    { text: `Task: Photo-realistic render. Wear ${clothName}. Return ONLY the raw base64 jpeg string. No markdown.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }],
            generationConfig: { temperature: 0.2 }
        }, { timeout: 60000 });

        const aiOutput = response.data.candidates[0].content.parts[0].text;
        
        if (!aiOutput) throw new Error("AI_EMPTY_RESPONSE");

        // --- 3. CLEAN & SAVE ---
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

        console.log("🚀 SUCCESS: Render Live!");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error("❌ API ERROR:", errorMsg);
        await db.collection("vto_jobs").doc(jobId).set({ status: "failed", error: errorMsg }, { merge: true });
        return { statusCode: 500, body: JSON.stringify({ error: errorMsg }) };
    }
};