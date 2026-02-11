const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    try {
        const body = JSON.parse(event.body);
        const rawImage = body.image || body.face;
        const cloth = body.cloth || "senator native outfit";

        // NUCLEAR DECODER: This turns your Base64 string back into the real key
        const decodedKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY, 'base64').toString('utf8');

        const auth = new GoogleAuth({
            credentials: {
                project_id: "kingsleystoreai",
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: decodedKey
            },
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });

        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality fashion photo. The person is wearing a luxury ${cloth}. Realistic fabric.`,
                image: { bytesBase64Encoded: rawImage.split('base64,').pop() }
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
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Modeling failed", details: error.message }) };
    }
};