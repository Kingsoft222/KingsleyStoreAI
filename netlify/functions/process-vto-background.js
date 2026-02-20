const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");

// --- 1. SECURE FIREBASE INITIALIZATION ---
const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            
            // Clean the key: remove quotes and fix the \n newline issue from Netlify
            if (privateKey) {
                privateKey = privateKey.replace(/^['"]|['"]$/g, '');
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: "kingsleystoreai",
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                }),
                storageBucket: "kingsleystoreai.firebasestorage.app"
            });
            console.log("SYSTEM: Firebase Initialized Successfully");
        } catch (error) {
            console.error("Firebase Init Error:", error.message);
            throw error; // Stop the function if Firebase fails
        }
    }
};

exports.handler = async (event) => {
    // Basic setup
    initializeFirebase();
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    
    // 2026 STABLE MODEL
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        // Update status in Firestore
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // --- 2. CALL GEMINI ---
        const result = await model.generateContent([
            `Task: Wear ${clothName}. Return ONLY the base64 jpeg string. No markdown, no text.`,
            { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]);

        const response = await result.response;
        const aiOutput = response.text();

        // Safety check for empty data
        if (!aiOutput || aiOutput.length < 500) {
            throw new Error("AI_EMPTY: Model returned no image data.");
        }

        // --- 3. PROCESS & SAVE ---
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, 'base64');
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);
        
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        // Format the Public URL correctly
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

        // --- 4. SUCCESS UPDATE ---
        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("SUCCESS: Ankara image saved and public.");

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Job processed successfully" })
        };

    } catch (error) {
        console.error("FUNCTION ERROR:", error.message);
        
        // Log the failure so the frontend knows
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });

        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};