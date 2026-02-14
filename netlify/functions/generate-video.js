const axios = require('axios');
const { JWT } = require('google-auth-library');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { swappedImage, clothName } = JSON.parse(event.body);

        // 1. Authenticate using the Service Account keys from Netlify Env
        const client = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        const tokens = await client.authorize();
        const ACCESS_TOKEN = tokens.access_token;

        // 2. Trigger Veo 3.1 for the "Doppl" Walk Cycle
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/veo-3.1-generate-001:predict`;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality 4k video of the person in [1] walking toward the camera. The ${clothName} should drape and move naturally. Keep the face 100% identical to [1].`,
                referenceImages: [{
                    referenceId: 1,
                    referenceType: "REFERENCE_TYPE_SUBJECT",
                    image: { bytesBase64Encoded: swappedImage }
                }]
            }],
            parameters: { durationSeconds: 6, aspectRatio: "9:16", fps: 30 }
        }, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ videoUrl: response.data.predictions[0].videoUri })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};