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

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        /**
         * 2026 BRUTE FORCE:
         * We stop trying to "Inpaint" and instead use "Image-to-Image"
         * with a very high prompt weight to force the change.
         */
        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo. Replace the current clothes with a luxury ${cloth} senator native outfit. Maintain the person's face and pose.`,
                image: { bytesBase64Encoded: image.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                // We remove editMode and maskConfig to stop the 'Silent Success' failure
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}` }
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
        console.error("DEBUG_FAIL:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Processing failed', details: error.message })
        };
    }
};