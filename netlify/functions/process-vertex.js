const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    try {
        const body = JSON.parse(event.body);
        const image = body.image || body.face;
        const cloth = body.cloth;

        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        /**
         * 2026 UPDATED ENDPOINT: Dedicated Virtual Try-On
         * Note: the model name is now 'virtual-try-on-001'
         */
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        const payload = {
            instances: [{
                // The new model requires these specific keys
                person_image: { bytesBase64Encoded: image.split(';base64,').pop() },
                garment_description: `A luxury ${cloth} senator native outfit for men`
            }],
            parameters: {
                sampleCount: 1,
                // Higher guidance forces the model to actually change the pixels
                guidanceScale: 75 
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        // The try-on model returns 'image' inside the prediction
        const prediction = response.data.predictions[0];
        const output = prediction.bytesBase64Encoded || prediction.image?.bytesBase64Encoded;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${output}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("TRY_ON_CRITICAL_FAIL:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Try-on failed', details: error.message })
        };
    }
};