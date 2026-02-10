const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    try {
        const { image, cloth } = JSON.parse(event.body);
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo. The person is now wearing a luxury ${cloth} senator native outfit. Realistic fabric, perfect fit.`,
                image: { bytesBase64Encoded: image.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                safetySetting: "block_none", // We use block_none to force the most permissive check
                personGeneration: "allow_adult",
                includeRaiReason: true
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const prediction = response.data.predictions[0];

        /**
         * THE DIAGNOSTIC CHECK: 
         * If Google sends the same image back, we FORCE an error 
         * so we can see the 'raiFilteredReason' in the logs.
         */
        if (prediction.raiFilteredReason || !prediction.bytesBase64Encoded) {
            throw new Error(`GOOGLE_REJECTION: ${prediction.raiFilteredReason || 'Silent Filter'}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
                status: "success"
            })
        };

    } catch (error) {
        // This will now print the EXACT reason in your Netlify Function Logs
        console.error("CRITICAL_DIAGNOSTIC:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Diagnostic Failed', details: error.message })
        };
    }
};