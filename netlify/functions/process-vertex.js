const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const body = JSON.parse(event.body);
        const { image, cloth } = body;

        if (!image || !cloth) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing image/cloth' }) };
        }

        // 1. AUTHENTICATION
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // 2. ENDPOINT SETUP
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const LOCATION = 'us-central1';
        // Restoring the specific model version that worked
        const apiURL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/image-generation@006:predict`;

        // 3. DATA PREP (Strict cleaning)
        const base64Image = image.split(';base64,').pop();

        /** * 4. THE PAYLOAD (Corrected for image-generation@006)
         * We explicitly add mimeType to the instance to stop silent failures.
         */
        const payload = {
            instances: [{
                prompt: `A professional fashion photo of the person provided wearing the ${cloth} senator native outfit. High quality fabric, realistic fit, professional lighting.`,
                image: { 
                    bytesBase64Encoded: base64Image,
                    mimeType: "image/png" 
                }
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                // Safety overrides: 'block_none' ensures the AI doesn't silently ignore the prompt
                safetySetting: "block_none",
                personGeneration: "allow_adult",
                includeRaiReason: true
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 5. VALIDATION
        const prediction = response.data.predictions && response.data.predictions[0];
        
        if (!prediction || !prediction.bytesBase64Encoded) {
            throw new Error("AI successfully reached but returned no image bytes. Check Safety filters.");
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
                status: "success"
            })
        };

    } catch (error) {
        // This console.error is what you will see in your Netlify dashboard logs
        console.error("STRICT_VERTEX_ERROR:", error.response ? JSON.stringify(error.response.data) : error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Vertex Processing Failed', 
                details: error.message 
            })
        };
    }
};