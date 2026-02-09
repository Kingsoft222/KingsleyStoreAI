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
         * THE RESTORED LOGIC:
         * We use 'inpainting-insert' with 'MASK_MODE_FOREGROUND' 
         * to force the AI to swap clothes on the person automatically.
         */
        const payload = {
            instances: [
                {
                    prompt: `A professional fashion photo of the person wearing the ${cloth} senator native outfit. High-quality fabric, realistic textures, maintain face and pose.`,
                    image: { 
                        bytesBase64Encoded: image.split(';base64,').pop() 
                    }
                }
            ],
            parameters: {
                sampleCount: 1,
                // FORCING THE SWAP: This tells Google to find the person and change their clothes
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

        // Ensure we actually got a new image back
        if (!prediction || !prediction.bytesBase64Encoded) {
            throw new Error("AI returned success but failed to generate a new image.");
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