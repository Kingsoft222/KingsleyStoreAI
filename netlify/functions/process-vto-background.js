const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

// --- 1. SECURE AUTHENTICATION ---
// Using the variable name we confirmed exists in your Netlify logs
const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount;

if (rawEnv) {
    try {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        console.log("✅ SYSTEM: Service Account Parsed for:", serviceAccount.project_id);
    } catch (e) {
        console.error("❌ CRITICAL: JSON Parse failed for FIREBASE_SERVICE_ACCOUNT");
    }
}

// Initialize Firebase Admin
if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
    });
}

// Initialize Vertex AI
// We explicitly pass the service account to fix the [VertexAI.GoogleAuthError]
const vertex_ai = new VertexAI({
    project: serviceAccount ? serviceAccount.project_id : "kingsleystoreai",
    location: "us-central1",
    googleAuthOptions: {
        credentials: serviceAccount
    }
});

// Using the stable 2026 model version
const model = vertex_ai.getGenerativeModel({ model: "gemini-2.0-flash" });

exports.handler = async (event) => {
    // Check if configuration is present
    if (!serviceAccount) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Configuration Error: FIREBASE_SERVICE_ACCOUNT not found in Netlify." }) 
        };
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid Request Body" }) };
    }

    const { jobId, userImage, clothName } = body;

    try {
        // Step 1: Update Firestore status to processing
        await db.collection("vto_jobs").doc(jobId).set({
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Step 2: Call Vertex AI for the Render
        const request = {
            contents: [{
                role: "user",
                parts: [
                    { text: `TASK: Photo-realistic virtual try-on. Render the person in the image wearing a ${clothName}. Return ONLY the raw base64 jpeg data string. No markdown text.` },
                    { inlineData: { mimeType: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const result = await model.generateContent(request);
        const response = await result.response;
        const aiOutput = response.candidates[0].content.parts[0].text;

        if (!aiOutput) throw new Error("AI returned an empty response.");

        // Step 3: Clean Base64 and Save to Cloud Storage
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
            metadata: { contentType: "image/jpeg" },
            public: true
        });

        // Step 4: Update Firestore with final result
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("🚀 SUCCESS: Ankara Render Live for Job:", jobId);
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("❌ VTO ERROR:", error.message);
        
        // Log failure to Firestore so the user gets the alert
        await db.collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
        
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};