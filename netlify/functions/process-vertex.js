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

        // 1. AUTHENTICATION (Using your saved Netlify Variables)
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // 2. VERTEX SETUP
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const LOCATION = 'us-central1';
        const apiURL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/image-generation@006:predict`;

        // 3. IMAGE PREP
        const base64Image = image.split(';base64,').pop();

        /**
         * 4. THE RESTORED PROMPT
         * This prompt is designed specifically for clothing replacement.
         */
        const payload = {
            instances: [{
                prompt: `A hyper-realistic fashion photograph of the person in the input image, now wearing the ${cloth} senator native outfit. The new clothing must perfectly replace the original outfit, maintaining the person's pose and background. High fashion, 8k resolution.`,
                image: { bytesBase64Encoded: base64Image }
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/png",
                // Ensuring the AI focuses on "edit" mode rather than "new image" mode
                editConfig: {
                    editMode: "CLOTHING_REPLACEMENT" 
                }
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 5. EXTRACT & RETURN
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
        console.error("Vertex AI Error:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'AI Swap Failed: ' + (error.response?.data?.error?.message || error.message) })
        };
    }
};