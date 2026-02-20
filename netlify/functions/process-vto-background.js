const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// 1. Initialize Firebase with a cleaner check
if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "kingsleystoreai",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            }),
            storageBucket: "kingsleystoreai.firebasestorage.app"
        });
        console.log("SYSTEM: Firebase Connected");
    } catch (error) {
        console.error("Firebase Init Error:", error.message);
    }
}

exports.handler = async (event) => {
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    // 2. THE STABLE 2026 MODEL: gemini-2.5-flash
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        await db.collection("vto_jobs").doc(jobId).set({ status: "processing" }, { merge: true });

        // 3. GENERATE
        const result = await model.generateContent([
            `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No text.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const response = await result.response;
        const aiOutput = response.text();

        // Safety Catch: Don't save empty files
        if (!aiOutput || aiOutput.length < 500) {
            throw new Error("AI returned no image data. Likely a safety block.");
        }

        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, 'base64');
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        // 4. THE CORRECT PUBLIC URL
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl
        });

        console.log("SUCCESS: Image created.");

    } catch (error) {
        console.error("LOG:", error.message);
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};