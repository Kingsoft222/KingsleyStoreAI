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
        // Using the most robust model for clothing swaps
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const base64Image = image.split(';base64,').pop();

        /** * THE ENFORCER PAYLOAD
         * We are using 'inpainting-insert' with 'MASK_MODE_FOREGROUND'
         * This forces the AI to detect the person and swap their clothes.
         */
        const payload = {
            instances: [{
                prompt: `A professional, high-quality fashion photo of the person in the input image wearing a luxury ${cloth} senator native outfit. The new clothing must perfectly replace the current outfit. High-end fabric, 8k resolution.`,
                image: { 
                    bytesBase64Encoded: base64Image,
                    mimeType: "image/png" 
                }
            }],
            parameters: {
                sampleCount: 1,
                // These are the "Top Notch" settings that force the swap
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

        // Get the generated image
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
        console.error("CRITICAL_SWAP_ERROR:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Vertex AI Failed', 
                details: error.message 
            })
        };
    }
};