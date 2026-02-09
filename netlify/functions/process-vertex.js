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
        // Using @006 which supports automatic foreground masking
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const base64Image = image.split(';base64,').pop();

        /** * THE "RESTORED" PAYLOAD
         * This uses the specific Inpainting structure required for 2026
         */
        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo. The person is now wearing a luxury ${cloth} senator native outfit for men. Realistic fabric, professional lighting, maintain the person's face.`,
                image: { 
                    bytesBase64Encoded: base64Image
                }
            }],
            parameters: {
                sampleCount: 1,
                // These parameters force the AI to 'edit' the person specifically
                editMode: "inpainting-insert",
                maskConfig: {
                    maskMode: "MASK_MODE_FOREGROUND" 
                },
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
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
        console.error("TOP_NOTCH_ERROR:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Vertex AI Processing Failed', 
                details: error.message 
            })
        };
    }
};