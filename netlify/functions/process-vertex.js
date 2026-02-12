const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    try {
        const body = JSON.parse(event.body);
        const rawImage = body.image || body.face;
        const cloth = body.cloth || "luxury nigerian senator outfit";

        const encodedKey = process.env.G_KEY_B64;
        if (!encodedKey) throw new Error("G_KEY_B64 is missing.");

        // THE ULTIMATE DECODER FIX
        // 1. Decode Base64 to string
        // 2. Force any literal "\n" text to become REAL line breaks
        const privateKey = Buffer.from(encodedKey, 'base64')
            .toString('utf8')
            .split('\\n')
            .join('\n');

        const auth = new GoogleAuth({
            credentials: {
                project_id: "kingsleystoreai",
                client_email: "firebase-adminsdk-fbsvc@kingsleystoreai.iam.gserviceaccount.com",
                private_key: privateKey
            },
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });

        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;
        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality fashion photo. The person is wearing a luxury ${cloth}. Realistic fabric.`,
                image: { bytesBase64Encoded: cleanBase64 }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                personGeneration: "allow_adult",
                safetySetting: "block_none"
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ outputImage: `data:image/png;base64,${response.data.predictions[0].bytesBase64Encoded}` })
        };
    } catch (error) {
        console.error("DEPLOY_LOG:", error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Still failing key decode", details: error.message }) };
    }
};