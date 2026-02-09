const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    try {
        const body = JSON.parse(event.body);
        // We handle both potential key names ('image' from new code, 'face' from old code)
        const image = body.image || body.face;
        const cloth = body.cloth;

        console.log(`Processing swap: Cloth=${cloth}, Project=${process.env.GOOGLE_PROJECT_ID}`);

        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        // Using the 2026 stable try-on endpoint
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                prompt: `A professional studio fashion photo. Change the person's outfit to a luxury ${cloth} senator native outfit. High-end fabric, realistic fit, maintain face identity.`,
                image: { bytesBase64Encoded: image.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: {
                    maskMode: "MASK_MODE_FOREGROUND" 
                },
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const prediction = response.data.predictions[0];
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("LOG_ERROR:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Try-on failed', details: error.message })
        };
    }
};