const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

// --- 1. SAFE ENVIRONMENT LOADING ---
// This prevents the "SyntaxError: undefined" crash during the init phase
let serviceAccount;
try {
    const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!rawJson) {
        console.error("❌ CRITICAL: GOOGLE_SERVICE_ACCOUNT_JSON is missing from Netlify!");
    } else {
        serviceAccount = JSON.parse(rawJson);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
} catch (err) {
    console.error("❌ JSON PARSE ERROR:", err.message);
}

// --- 2. INITIALIZE FIREBASE ---
if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "kingsleystoreai.firebasestorage.app"
    });
}

exports.handler = async (event) => {
    // Check if init failed
    if (!serviceAccount) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Backend Configuration Missing (JSON error)" }) 
        };
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    // Safe Body Parsing
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid Request Body" }) };
    }

    const { jobId, userImage, clothName } = body;

    // --- 3. INITIALIZE VERTEX AI ---
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
                    { text: `TASK: Photo-realistic virtual try-on. Edit the person to wear ${clothName}. Return ONLY raw base64 jpeg data.` },
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

        console.log("✅ SUCCESS: Vertex AI Handshake Complete.");
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