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
    
    // SAFETY BYPASS: This prevents the "empty response" 0kb bug
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", 
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

        const result = await model.generateContent([
            `Task: Generate a photo of this person wearing a ${clothName}. Return ONLY the base64 jpeg string.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const response = await result.response;
        const aiOutput = response.text();

        // VALIDATION: Stop the 0kb file creation
        if (!aiOutput || aiOutput.length < 100) {
            throw new Error("AI returned empty content. Possible safety block or thinking timeout.");
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

        console.log("SUCCESS: Real data saved!");

    } catch (error) {
        console.error("FINAL ERROR:", error.message);
        await admin.firestore().collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};