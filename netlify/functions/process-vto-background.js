const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

// --- 1. THE "NO-GUESING" AUTH LOADER ---
let serviceAccount;
const rawEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!rawEnv) {
    // This will show up in your Netlify logs to tell us exactly what happened
    console.error("❌ ERROR: GOOGLE_SERVICE_ACCOUNT_JSON is NOT in process.env");
    console.log("DEBUG: Available Env Keys:", Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET')));
} else {
    try {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        console.log("✅ SUCCESS: Service Account Loaded for Project:", serviceAccount.project_id);
    } catch (e) {
        console.error("❌ ERROR: JSON Parse failed. Check for trailing commas or extra quotes.");
    }
}

// --- 2. INITIALIZE FIREBASE ---
if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
    });
}

exports.handler = async (event) => {
    if (!serviceAccount) {
        return { statusCode: 500, body: JSON.stringify({ error: "Environment Variable Missing. Check Netlify Scopes." }) };
    }

    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const { jobId, userImage, clothName } = JSON.parse(event.body);

    const vertex_ai = new VertexAI({
        project: serviceAccount.project_id,
        location: "us-central1",
        googleAuthOptions: { credentials: serviceAccount }
    });

    const model = vertex_ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        await db.collection("vto_jobs").doc(jobId).update({ status: "processing" });

        const request = {
            contents: [{
                role: "user",
                parts: [
                    { text: `Wear ${clothName}. Return ONLY raw base64 jpeg.` },
                    { inlineData: { mimeType: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const result = await model.generateContent(request);
        const response = await result.response;
        const aiOutput = response.candidates[0].content.parts[0].text;

        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);

        await file.save(buffer, { metadata: { contentType: "image/jpeg" }, public: true });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        await db.collection("vto_jobs").doc(jobId).update({ status: "completed", resultImageUrl: publicUrl });

        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("VTO ERROR:", error.message);
        await db.collection("vto_jobs").doc(jobId).update({ status: "failed", error: error.message });
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};