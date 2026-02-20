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
    } catch (error) {
        console.error("🔥 Firebase Init Error:", error.message);
    }
}

exports.handler = async (event) => {
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    try {
        await db.collection("vto_jobs").doc(jobId).update({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // --- 2. THE STABLE 2.0 ENDPOINT ---
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{
                parts: [
                    { text: `TASK: Virtual Try-On. Edit this person to wear a realistic ${clothName}. Return ONLY the base64 JPEG string of the result. No text.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }],
            generationConfig: { 
                temperature: 0.1,
                maxOutputTokens: 8192 
            }
        }, { timeout: 120000 });

        // Extracting the response
        const aiOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiOutput) throw new Error("AI returned an empty response.");

        // --- 3. CLEAN & SAVE TO STORAGE ---
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, 'base64');
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        // The Direct Google Storage URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl
        });

        console.log("🚀 SUCCESS: Ankara Render Ready!");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error("❌ ERROR:", errorMsg);
        await db.collection("vto_jobs").doc(jobId).update({ status: "failed", error: errorMsg });
        return { statusCode: 500, body: JSON.stringify({ error: errorMsg }) };
    }
};