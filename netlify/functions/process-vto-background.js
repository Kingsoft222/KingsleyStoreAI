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
    
    // 2026 PRODUCTION MODEL: gemini-1.5-flash-latest
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    });

    try {
        const jobRef = admin.firestore().collection("vto_jobs").doc(jobId);
        await jobRef.set({ status: "processing" }, { merge: true });

        // The "Money" Prompt: Direct and forceful
        const result = await model.generateContent([
            `Task: Photo-realistic virtual try-on. Put the person in this photo into a ${clothName}. Return ONLY the raw base64 jpeg string. No markdown, no text.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const response = await result.response;
        const aiOutput = response.text();

        // FAIL-SAFE: Stop 0kb charges
        if (!aiOutput || aiOutput.length < 1000) {
            throw new Error("AI output was too small. Likely a safety block or timeout.");
        }

        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = admin.storage().bucket().file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        // The Public Access URL
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/kingsleystoreai.firebasestorage.app/o/${encodeURIComponent('results/' + jobId + '.jpg')}?alt=media`;

        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("SUCCESS: Image is live and ready.");

    } catch (error) {
        console.error("FINAL ATTEMPT ERROR:", error.message);
        await admin.firestore().collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};