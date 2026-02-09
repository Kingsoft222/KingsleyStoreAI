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

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        // Clean the image data
        const base64Image = image.split(';base64,').pop();

        /** * THE 2026 "INPAINT-ADD" PAYLOAD
         * This uses automatic mask detection to find the person 
         * and replace their clothes specifically.
         */
        const payload = {
            instances: [{
                prompt: `A high-quality, professional fashion photo of the person provided wearing a ${cloth} senator native outfit. The new clothing must perfectly replace the existing outfit. High-end fabric textures, maintain the person's identity and background.`,
                image: { 
                    bytesBase64Encoded: base64Image
                }
            }],
            parameters: {
                sampleCount: 1,
                // These specific keys are required for the @006 'Edit' mode
                editConfig: {
                    editMode: "inpainting-insert",
                    maskConfig: {
                        maskMode: "MASK_MODE_FOREGROUND" 
                    }
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
                status: "success"
            })
        };

    } catch (error) {
        // This will print the EXACT error from Google in your Netlify logs
        console.error("GOOGLE_API_ERROR:", error.response?.data || error.message);
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