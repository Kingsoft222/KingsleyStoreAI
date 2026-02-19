const axios = require("axios");
const admin = require("firebase-admin");

if (!admin.apps.length) {
    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;
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
    } catch (error) {
        console.error("Firebase Init Error:", error.message);
    }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

exports.handler = async (event) => {
    // Netlify Background functions use POST by default
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const jobRef = db.collection("vto_jobs").doc(jobId);

        // Step 1: Status Processing (with SET if missing to prevent 404)
        await jobRef.set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Step 2: Call Gemini
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                contents: [{
                    parts: [
                        { text: `Return ONLY the raw base64 jpeg string of the person wearing ${clothName}. No markdown.` },
                        { inline_data: { mime_type: "image/jpeg", data: userImage } }
                    ]
                }]
            },
            { timeout: 120000 }
        );

        let aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        // Step 3: Save to Storage
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = bucket.file(`results/${jobId}.jpg`);
        
        // We use public: true so the frontend doesn't need tokens to see it
        await file.save(buffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true
        });

        // Construct the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/results/${jobId}.jpg`;

        // Step 4: Final Update
        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`SUCCESS: Image saved for ${jobId}`);

    } catch (error) {
        console.error("Process Error:", error.message);
        // Fallback to update status if document exists
        try {
            await db.collection("vto_jobs").doc(jobId).set({ 
                status: "failed", 
                error: error.message 
            }, { merge: true });
        } catch (e) { console.error("Final fail log error:", e.message); }
    }
};