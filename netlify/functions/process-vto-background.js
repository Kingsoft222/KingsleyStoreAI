const admin = require("firebase-admin");
const { VertexAI } = require("@google-cloud/vertexai");

// 1. Initialize Firebase (Enterprise JSON Method)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "kingsleystoreai.firebasestorage.app"
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// 2. Initialize Vertex AI (The Permanent Way)
const vertex_ai = new VertexAI({
  project: "kingsleystoreai", 
  location: "us-central1"
});

// Using the 2026 Stable Workhorse
const model = vertex_ai.getGenerativeModel({
  model: "gemini-1.5-flash" 
});

exports.handler = async (event) => {
  const { jobId, userImage, clothName } = JSON.parse(event.body);

  try {
    await db.collection("vto_jobs").doc(jobId).update({
      status: "processing",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Requesting the Render
    const request = {
      contents: [{
        role: "user",
        parts: [
          { text: `TASK: Photo-realistic virtual try-on. Edit the person to wear a ${clothName}. Return ONLY the raw base64 jpeg string.` },
          { inlineData: { mimeType: "image/jpeg", data: userImage } }
        ]
      }]
    };

    const result = await model.generateContent(request);
    const response = await result.response;
    const aiOutput = response.candidates[0].content.parts[0].text;

    if (!aiOutput) throw new Error("AI returned empty content");

    // 4. Clean and Save
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

    console.log("✅ SUCCESS: Render live on Vertex AI");
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