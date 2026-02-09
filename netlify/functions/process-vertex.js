const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const { image, cloth } = JSON.parse(event.body);
        if (!image || !cloth) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing data' }) };
        }

        // 1. Authenticate using the Service Account Key from Netlify
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // 2. Setup Vertex AI (Imagen 3 / Try-On)
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const LOCATION = 'us-central1';
        // Note: Using image-generation@006 for fashion-related swaps
        const apiURL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/image-generation@006:predict`;

        // 3. Prepare Image Data (Strip the data:image prefix)
        const base64Image = image.split(';base64,').pop();

        const payload = {
            instances: [{
                prompt: `A high-quality, professional fashion photo of the person provided wearing the ${cloth} outfit. The clothing should replace the existing upper body garments perfectly with realistic fabric textures.`,
                image: { bytesBase64Encoded: base64Image }
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/png"
            }
        };

        // 4. Call Vertex AI
        const response = await axios.post(apiURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 5. Return the transformed image
        const generatedBase64 = response.data.predictions[0].bytesBase64Encoded;
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${generatedBase64}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("Vertex AI Error:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'AI Error: ' + (error.response?.data?.error?.message || error.message) })
        };
    }
};