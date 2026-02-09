const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
    };

    try {
        const body = JSON.parse(event.body);
        // Supports both 'image' and 'face' keys just in case
        const imageData = body.image || body.face;
        const clothName = body.cloth;

        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        // Using the most stable legacy model for 2026
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo of the person wearing a ${clothName} senator native outfit. Professional studio lighting.`,
                image: { 
                    bytesBase64Encoded: imageData.split(';base64,').pop() 
                }
            }],
            parameters: {
                sampleCount: 1,
                // We are removing all complex mask/edit keys that are causing the 59ms rejection
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
        console.error("LEGACY_RESET_ERROR:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Processing failed', details: error.message })
        };
    }
};