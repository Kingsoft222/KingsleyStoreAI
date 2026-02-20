const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

// --- 1. THE NAME MATCH FIX ---
let serviceAccount;
// Use the name that showed up in your DEBUG logs
const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT; 

if (!rawEnv) {
    console.error("❌ CRITICAL: FIREBASE_SERVICE_ACCOUNT is missing from Netlify!");
} else {
    try {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        console.log("✅ SUCCESS: Service Account Loaded for:", serviceAccount.project_id);
    } catch (e) {
        console.error("❌ ERROR: JSON Parse failed. Key might be corrupted.");
    }
}

// --- 2. INITIALIZE FIREBASE ---
if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "kingsleystoreai.firebasestorage.app"
    });
}

exports.handler = async (event) => {
    if (!serviceAccount) {
        return { statusCode: 500, body: JSON.stringify({ error: "Firebase Service Account Missing" }) };
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const { jobId, userImage, clothName } = JSON.parse(event.body);

    // --- 3. VERTEX AI WITH EXPLICIT AUTH ---
    const vertex_ai = new VertexAI({
        project: serviceAccount.project_id,
        location: "us-central1",
        googleAuthOptions: { credentials: serviceAccount }
    });

    const model = vertex_ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        await db.collection("vto_jobs").doc(jobId).update({
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const request = {
            contents: [{
                role: "user",
                parts: [
                    { text: `TASK: Virtual Try-On. Render this person wearing ${clothName}. Return ONLY raw base64 jpeg.` },
                    { inlineData: { mimeType: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const result = await model.generateContent(request);
        const response = await result.response;
        const aiOutput = response.candidates[0].content.parts[0].text;

        // 4. CLEAN AND SAVE
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
            metadata: { contentType: "image/jpeg" },
            public: true
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl
        });

        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("VTO ERROR:", error.message);
        await db.collection("vto_jobs").doc(jobId).update({
            status: "failed",
            error: error.message
        });
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};