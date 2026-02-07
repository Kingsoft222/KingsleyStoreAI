const { onRequest } = require("firebase-functions/v2/https");
const { GoogleAuth } = require("google-auth-library");

exports.generateLook = onRequest({ cors: true, timeoutSeconds: 300 }, async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { user_image, garment_image } = req.body;
    const project = "kingsleystoreai"; 
    const location = "us-central1"; 

    try {
        // Authenticate using the built-in service account
        const auth = new GoogleAuth({ 
            scopes: "https://www.googleapis.com/auth/cloud-platform" 
        });
        const client = await auth.getClient();
        const accessToken = (await client.getAccessToken()).token;

        // The official Google Vertex AI Virtual Try-On endpoint
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/virtual-try-on-001:predict`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                instances: [{
                    personImage: { image: { bytesBase64Encoded: user_image } },
                    productImages: [{ image: { bytesBase64Encoded: garment_image } }]
                }],
                parameters: { sampleCount: 1 }
            })
        });

        const data = await response.json();
        
        if (data.predictions && data.predictions[0]) {
            // Return the processed image back to your website
            res.status(200).json({ output_image: data.predictions[0].bytesBase64Encoded });
        } else {
            res.status(500).json({ error: "AI failed to generate results", details: data });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});