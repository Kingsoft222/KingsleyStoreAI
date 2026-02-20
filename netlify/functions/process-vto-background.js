const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

// --- 1. PREPARE THE KEY ---
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

// --- 2. INITIALIZE FIREBASE ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "kingsleystoreai.firebasestorage.app"
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// --- 3. INITIALIZE VERTEX AI (THE AUTH FIX) ---
const vertex_ai = new VertexAI({
    project: serviceAccount.project_id,
    location: "us-central1",
    googleAuthOptions: {
        credentials: serviceAccount // This line kills the AuthError
    }
});

// Using 1.5 Flash for the highest stability in 2026
const model = vertex_ai.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.handler = async (event) => {
    const { jobId, userImage, clothName } = JSON.parse(event.body);

    try {
        await db.collection("vto_jobs").doc(jobId).update({
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const request = {
            contents: [{
                role: "user",
                parts: [
                    { text: `TASK: Photo-realistic virtual try-on. Render the person wearing ${clothName}. Return ONLY raw base64 jpeg data.` },
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

        console.log("✅ SUCCESS: Vertex AI Render Complete.");
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