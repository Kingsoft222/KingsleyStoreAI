const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const { image, cloth } = JSON.parse(event.body);
        if (!image || !cloth) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing data' }) };
        }

        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const LOCATION = 'us-central1';
        
        /**
         * UPDATED MODEL: Using the dedicated 'virtual-try-on-001'
         * This model expects a person image AND a product image.
         */
        const apiURL = `https://${LOCATION-aiplatform.googleapis.com}/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/virtual-try-on-001:predict`;

        const base64Person = image.split(';base64,').pop();
        
        // IMPORTANT: In your catalog, the cloth is a filename (e.g., 'senator_red.jpg').
        // We assume you have these stored in your public images folder.
        // For the AI to work, we point it to that cloth image.
        const clothUrl = `https://your-site.netlify.app/images/${cloth}`;

        const payload = {
            instances: [{
                personImage: { bytesBase64Encoded: base64Person },
                productImage: { 
                    // We use the image URL of the garment from your store
                    imageUri: clothUrl 
                }
            }],
            parameters: {
                sampleCount: 1,
                // Setting safety to 'block_only_high' to prevent silent failures
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

        // The virtual-try-on model returns an array of results
        const generatedBase64 = response.data.predictions[0].bytesBase64Encoded;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${generatedBase64}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("Vertex AI Error:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Try-on failed: ' + (error.response?.data?.error?.message || error.message) })
        };
    }
};