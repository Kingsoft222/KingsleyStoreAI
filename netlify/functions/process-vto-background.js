const axios = require("axios");
const admin = require("firebase-admin");

// [Keep your existing admin.initializeApp block here]

exports.handler = async (event) => {
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    try {
        const jobRef = admin.firestore().collection("vto_jobs").doc(jobId);

        // HARD FIX: Wait 2 seconds for Firestore to propagate before updating
        await new Promise(r => setTimeout(r, 2000));

        await jobRef.set({ 
            status: "processing",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Gemini Call
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
            { timeout: 110000 }
        );

        const aiOutput = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiOutput.replace(/```[a-z]*\n?|```|\s/gi, "");

        // Storage Save
        const buffer = Buffer.from(cleanBase64, 'base64');
        const file = admin.storage().bucket().file(`results/${jobId}.jpg`);
        
        await file.save(buffer, { metadata: { contentType: 'image/jpeg' }, public: true });

        const publicUrl = `https://storage.googleapis.com/${admin.storage().bucket().name}/results/${jobId}.jpg`;

        await jobRef.update({
            status: "completed",
            resultImageUrl: publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error("Process Error:", error.message);
        await admin.firestore().collection("vto_jobs").doc(jobId).set({ 
            status: "failed", 
            error: error.message 
        }, { merge: true });
    }
};