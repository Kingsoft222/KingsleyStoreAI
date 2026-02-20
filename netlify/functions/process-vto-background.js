const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

// --- 1. SECURE SERVICE ACCOUNT LOADING ---
const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount;

if (rawEnv) {
    try {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    } catch (e) {
        console.error("❌ JSON Parse failed for FIREBASE_SERVICE_ACCOUNT");
    }
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
    });
}

// --- 2. VERTEX AI INITIALIZATION ---
const vertex_ai = new VertexAI({
    project: serviceAccount ? serviceAccount.project_id : "kingsleystoreai",
    location: "us-central1",
    googleAuthOptions: { credentials: serviceAccount }
});

const model = vertex_ai.getGenerativeModel({ model: "gemini-2.0-flash" });

exports.handler = async (event) => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const { jobId, userImage, clothName } = body;

    try {
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const request = {
            contents: [{
                role: "user",
                parts: [
                    { text: `TASK: Photo-realistic virtual try-on. Edit the person in the input image to wear a realistic ${clothName}. Return ONLY the raw base64 jpeg data string. No text, no markdown.` },
                    { inlineData: { mimeType: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const result = await model.generateContent(request);
        const response = await result.response;
        let aiOutput = response.candidates[0].content.parts[0].text;

        // --- 3. THE SURGICAL CLEANER (NO MORE BROKEN IMAGES) ---
        // This regex finds the longest continuous string of Base64 characters
        const base64Match = aiOutput.match(/[A-Za-z0-9+/=]{1000,}/g);
        
        if (!base64Match) {
            throw new Error("AI response did not contain a valid image data block.");
        }

        // Grab the longest block (the actual image data)
        const cleanBase64 = base64Match.sort((a, b) => b.length - a.length)[0];
        const buffer = Buffer.from(cleanBase64, "base64");

        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);

        // --- 4. SECURE SAVE TO STORAGE ---
        await file.save(buffer, {
            metadata: { 
                contentType: "image/jpeg",
                cacheControl: "public, max-age=31536000" // Tells browsers it's a permanent image
            },
            public: true,
            resumable: false 
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("🚀 SUCCESS: Ankara render is pure and live.");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("VTO ERROR:", error.message);
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
        
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};