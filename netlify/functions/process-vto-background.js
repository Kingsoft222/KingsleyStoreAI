const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount;

if (rawEnv) {
    try {
        serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    } catch (e) {
        console.error("❌ JSON Parse failed");
    }
}

if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
    });
}

const vertex_ai = new VertexAI({
    project: serviceAccount ? serviceAccount.project_id : "kingsleystoreai",
    location: "us-central1",
    googleAuthOptions: { credentials: serviceAccount }
});

const model = vertex_ai.getGenerativeModel({ model: "gemini-2.0-flash" });

exports.handler = async (event) => {
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const { jobId, userImage, clothName } = JSON.parse(event.body);

    try {
        await db.collection("vto_jobs").doc(jobId).set({ status: "processing" }, { merge: true });

        const request = {
            contents: [{
                role: "user",
                parts: [
                    // STICKER PROMPT: Tells AI to be strictly data-only
                    { text: `TASK: Virtual Try-On. Edit this person to wear ${clothName}. Return ONLY the raw base64 data. NO markdown, NO text, NO headers. Just the string.` },
                    { inlineData: { mimeType: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const result = await model.generateContent(request);
        const response = await result.response;
        let aiOutput = response.candidates[0].content.parts[0].text;

        // --- THE AGGRESSIVE CLEANER ---
        // This removes markdown blocks, whitespace, and non-base64 characters
        const cleanBase64 = aiOutput
            .replace(/```[a-z]*\n?/gi, "") // Remove starting ```
            .replace(/```/g, "")           // Remove ending ```
            .replace(/\s/g, "")            // Remove all spaces/newlines
            .trim();

        if (cleanBase64.length < 1000) throw new Error("AI_OUTPUT_CORRUPT");

        const buffer = Buffer.from(cleanBase64, "base64");
        const fileName = `results/${jobId}.jpg`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
            metadata: { contentType: "image/jpeg" },
            public: true,
            resumable: false // Faster for small/medium files
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        await db.collection("vto_jobs").doc(jobId).update({
            status: "completed",
            resultImageUrl: publicUrl
        });

        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("VTO ERROR:", error.message);
        await db.collection("vto_jobs").doc(jobId).set({ status: "failed", error: error.message }, { merge: true });
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};