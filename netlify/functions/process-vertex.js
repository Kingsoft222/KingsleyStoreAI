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
         * 2026 REFERENCE STRATEGY:
         * We stop using 'editMode'. Instead, we send the image as a 
         * 'base_image' and ask the model to generate a new one 
         * using the original as a structural guide.
         */
        const payload = {
            instances: [{
                // Use [0] to reference the structure of the input image
                prompt: `A professional studio portrait of the man from [0] now wearing a premium ${cloth} senator native outfit. Maintain his face, pose, and the background exactly as seen in [0]. High-end Nigerian fashion.`,
                image: { bytesBase64Encoded: image.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                // This tells the AI to treat the input as a "Reference", not an "Edit"
                // It's the most reliable way to bypass the 'Silent Return' bug
                guidanceScale: 60,
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
        console.error("REF_FAIL:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Generation failed', details: error.message })
        };
    }
};