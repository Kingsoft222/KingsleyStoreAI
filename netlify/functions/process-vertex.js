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

        /** * THE 2026 "MAGIC" PAYLOAD
         * We use 'editMode: "product-image"' or 'inpainting-insert'
         * paired with 'MASK_MODE_FOREGROUND' to force the clothing swap.
         */
        const payload = {
            instances: [{
                prompt: `A high-quality, professional fashion photo of the person provided wearing the ${cloth} senator native outfit. The new clothing must perfectly replace the existing outfit. High-end fabric textures.`,
                image: { bytesBase64Encoded: base64Image }
            }],
            parameters: {
                sampleCount: 1,
                // This is the specific instruction to "edit" instead of "generate"
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

        // If Google sends back the original, we want to know why
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