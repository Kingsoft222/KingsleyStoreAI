const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// --- 1. FIREBASE INITIALIZATION ---
const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            const rawKey = process.env.FIREBASE_PRIVATE_KEY;
            // Clean the key of any accidental spaces or bad formatting
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
        } catch (error) {
            console.error("Firebase Init Error:", error.message);
        }
    }
};

exports.handler = async (event) => {
    initializeFirebase();
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    // Parse incoming data
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    
    // Initialize Google AI with the NEW Key you generated
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Use the 8B model - it's faster and avoids many regional 404s
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

    try {
        const jobRef = db.collection("vto_jobs").doc(jobId);
        
        // Step 1: Set status to processing (merge: true prevents 404s)
        await jobRef.set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`AI START: Processing ${clothName} for ${jobId}`);

        // Step 2: Call Gemini via SDK
        const result = await model.generateContent([
            `Return ONLY the raw base64 jpeg string of the person wearing ${clothName} traditional wear. High quality, seamless fit. No markdown, no text.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const aiOutput = result.response.text();
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        // Step 3: Save to Storage (Creates the 'results' folder automatically)
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true // This makes the URL accessible to your app.js
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        // Step 4: Final Success Update
        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("SUCCESS: Image generated and stored in Firebase.");

    } catch (error) {
        console.error("CRITICAL SDK ERROR:", error.message);
        
        // Log the failure to Firestore so the UI stops spinning
        try {
            await db.collection("vto_jobs").doc(jobId).set({ 
                status: "failed", 
                error: error.message 
            }, { merge: true });
        } catch (e) { console.error("Could not log failure:", e.message); }
    }
};