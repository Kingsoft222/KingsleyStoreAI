const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    try {
        const body = JSON.parse(event.body);
        // Supports both 'image' and 'face' keys from your different app versions
        const imageData = body.image || body.face;
        const clothName = body.cloth;

        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                // Forceful prompt for direct replacement
                prompt: `A high-quality studio fashion photo of the man from the input image now wearing a premium ${clothName} senator native outfit. Maintain his face and pose exactly.`,
                image: { bytesBase64Encoded: imageData.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                // Bypassing the 'editMode' complex logic that causes silent fails
                safetySetting: "block_only_high", 
                personGeneration: "allow_adult",
                includeRaiReason: true // Forces Google to log the specific safety reason if it fails
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const prediction = response.data.predictions[0];

        // Return the final result
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
                status: "success"
            })
        };

    } catch (error) {
        // This will now print the EXACT reason Google is rejecting the request
        console.error("STRICT_FAIL:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'AI Processing Failed', details: error.message })
        };
    }
};