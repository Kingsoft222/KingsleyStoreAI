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
            console.log("SYSTEM: Firebase Ready");
        } catch (error) {
            console.error("Firebase Init Error:", error.message);
        }
    }
};

exports.handler = async (event) => {
    initializeFirebase();
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    
    // Initialize Google AI SDK
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const jobRef = db.collection("vto_jobs").doc(jobId);
        await jobRef.set({ status: "processing" }, { merge: true });

        // Generate content using the SDK (No URL to mess up)
        const result = await model.generateContent([
            `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const aiOutput = result.response.text();
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

        console.log("SUCCESS: SDK utilized, image saved.");

    } catch (error) {
        console.error("SDK ERROR:", error.message);
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};