const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
    };

    try {
        const { image, cloth } = JSON.parse(event.body);
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const base64Image = image.split(';base64,').pop();

        /** * THE "FORCED SWAP" PAYLOAD
         * We use editMode 'inpainting-insert' but we REMOVE the maskMode.
         * By removing the maskMode and providing a strong prompt, 
         * we force the AI to "re-imagine" the subject.
         */
        const payload = {
            instances: [{
                prompt: `A professional studio fashion photo. Change the person's current outfit to a luxury ${cloth} senator native outfit. High-end fabric, realistic fit, maintain face and background.`,
                image: { 
                    bytesBase64Encoded: base64Image
                }
            }],
            parameters: {
                sampleCount: 1,
                // Using the specific editMode that bypasses the "silent success" loop
                editMode: "inpainting-insert",
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const prediction = response.data.predictions[0];
        
        // Return the dressed image back to the app
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