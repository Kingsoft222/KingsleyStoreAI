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

        /**
         * 2026 INPAINTING STRUCTURE:
         * We must move 'editMode' and 'maskConfig' into the 'parameters' block
         * to force the "Foreground Detection" swap.
         */
        const payload = {
            instances: [
                {
                    prompt: `A high-quality fashion photo of the person wearing the ${cloth} senator native outfit. Realistic fabric, professional studio lighting.`,
                    image: { 
                        bytesBase64Encoded: image.split(';base64,').pop() 
                    }
                }
            ],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert", // Explicitly telling it to INSERT new content (clothes)
                maskConfig: {
                    maskMode: "MASK_MODE_FOREGROUND" // Automatically masks the person
                },
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const prediction = response.data.predictions[0];
        
        // Final sanity check: if Google still sends the original, it's a safety filter
        if (prediction.raiFilteredReason) {
            console.error("GOOGLE_BLOCKED_FOR_SAFETY:", prediction.raiFilteredReason);
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
        console.error("STRICT_FAIL:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Try-on failed', details: error.message })
        };
    }
};