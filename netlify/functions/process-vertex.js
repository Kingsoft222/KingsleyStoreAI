const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
    };

    try {
        // 1. Log to verify function wake-up
        console.log("Wake up: Processing clothing swap...");

        // 2. Parse the body from app.js (using 'face' and 'cloth' keys)
        const { face, cloth } = JSON.parse(event.body);
        
        if (!face || !cloth) {
            throw new Error("Missing face image or cloth selection");
        }

        // 3. Initialize Auth using your scoped Env Var
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        // 4. API Request to Vertex AI (Image Generation 006)
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo. The man in the image is now wearing a premium ${cloth} senator native outfit. Maintain face and pose.`,
                image: { bytesBase64Encoded: face.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                safetySetting: "block_none" // Crucial for Nigerian Senator styles
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            }
        });

        // 5. Return the swapped image
        const output = response.data.predictions[0].bytesBase64Encoded;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${output}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("FAIL:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Modeling failed. Please try a clearer photo.', 
                details: error.message 
            })
        };
    }
};