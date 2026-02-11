const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    
    try {
        // MATCHING YOUR APP.JS KEYS: face and cloth
        const { face, cloth } = JSON.parse(event.body);

        if (!face || !cloth) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing image or cloth data" }) };
        }

        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo. Replace the current clothes with a luxury ${cloth} senator native outfit. Realistic fabric, perfect fit, maintain person's face.`,
                image: { bytesBase64Encoded: face.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                safetySetting: "block_none" // Bypassing filters that cause the 104ms skip
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const output = response.data.predictions[0].bytesBase64Encoded;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${output}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("FAIL:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Modeling failed. Please try a clearer photo.', details: error.message })
        };
    }
};