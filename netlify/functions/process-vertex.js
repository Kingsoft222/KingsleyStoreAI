const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const { image, cloth } = JSON.parse(event.body);
        if (!image || !cloth) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing data' }) };

        // 1. AUTH
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // 2. CONFIG
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const LOCATION = 'us-central1';
        const apiURL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/virtual-try-on-001:predict`;

        // 3. PREPARE DATA
        const base64Person = image.split(';base64,').pop();
        
        // This must be the FULL URL to the cloth image on your live site
        const clothUrl = `https://kingsleystoreai.netlify.app/images/${cloth}`;

        /**
         * 4. EXACT GOOGLE STRUCTURE (Updated for 2026)
         * Note the nested "image" keys - this is where most people fail.
         */
        const payload = {
            instances: [
                {
                    personImage: {
                        image: { bytesBase64Encoded: base64Person }
                    },
                    productImages: [
                        {
                            image: { imageUri: clothUrl }
                        }
                    ]
                }
            ],
            parameters: {
                sampleCount: 1,
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 5. EXTRACT
        const prediction = response.data.predictions[0];
        const generatedBase64 = prediction.bytesBase64Encoded;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${generatedBase64}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("LOG_ERROR:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'AI Error', 
                details: error.response?.data?.error?.message || error.message 
            })
        };
    }
};