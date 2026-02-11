const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    
    try {
        const { face, cloth } = JSON.parse(event.body);

        if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY in Netlify Dashboard");
        }

        // Authenticate using the key you provided
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                prompt: `A professional studio fashion photo. The person is now wearing a premium ${cloth} senator native outfit.`,
                image: { bytesBase64Encoded: face.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                safetySetting: "block_none"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${response.data.predictions[0].bytesBase64Encoded}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("LOG_FAIL:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Try-on failed', details: error.message })
        };
    }
};