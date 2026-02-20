const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// --- 1. THE PEM KEY FIX ---
const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            
            // This is the absolute fix for the string you have on Netlify
            const formattedKey = privateKey
                .replace(/\\n/g, '\n')     // Convert literal \n to real newlines
                .replace(/^['"]|['"]$/g, ''); // Remove any accidental quotes

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: "kingsleystoreai",
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: formattedKey
                }),
                storageBucket: "kingsleystoreai.firebasestorage.app"
            });
            console.log("SYSTEM: Firebase Key Successfully Parsed.");
        } catch (error) {
            console.error("Firebase Init Error:", error.message);
            throw error;
        }
    }
};

exports.handler = async (event) => {
    initializeFirebase();
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    // Using the absolute latest production model for 2026
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });

        // CALL GEMINI
        const result = await model.generateContent([
            `Task: Generate a photo of the person wearing a ${clothName}. Return ONLY the raw base64 jpeg string. No text or markdown.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const aiOutput = result.response.text();

        if (!aiOutput || aiOutput.length < 500) {
            throw new Error("AI_FAILURE: The response was empty or blocked.");
        }

        // CLEAN AND SAVE
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

        console.log("SUCCESS: Image generated successfully!");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("FINAL ERROR:", error.message);
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};