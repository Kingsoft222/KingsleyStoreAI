const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        console.log("--- START VERTEX CALL ---");
        const { image, cloth } = JSON.parse(event.body);

        // 1. AUTH
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // 2. CONFIG (Restoring the image-generation@006 model)
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const LOCATION = 'us-central1';
        const apiURL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/image-generation@006:predict`;

        const base64Image = image.split(';base64,').pop();

        /** * 3. THE RESTORED PROMPT
         * Using the exact structure that previously triggered the clothing swap.
         */
        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo of the person in the input image wearing the ${cloth} senator native outfit. Maintain person's face and pose, realistic fabric textures, professional lighting.`,
                image: { bytesBase64Encoded: base64Image }
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                // Safety overrides to prevent silent failures
                safetySetting: "block_none",
                personGeneration: "allow_adult"
            }
        };

        console.log("Requesting swap for cloth:", cloth);
        const response = await axios.post(apiURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 4. STRICT RESULT CHECK
        if (!response.data.predictions || response.data.predictions.length === 0) {
            console.error("GOOGLE_SILENT_FAIL: No prediction returned. Check Safety filters.");
            throw new Error("AI returned success but no image was generated. Try a different photo.");
        }

        const prediction = response.data.predictions[0];
        // If Google sends back the original image, we log it
        if (prediction.raiFilteredReason) {
            console.warn("SAFETY_FILTER_TRIGGERED:", prediction.raiFilteredReason);
        }

        const finalBase64 = prediction.bytesBase64Encoded;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${finalBase64}`,
                status: "success"
            })
        };

    } catch (error) {
        // This will now DEFINITELY show up on your Netlify Dashboard
        console.error("LOG_ERROR_DETAIL:", error.response ? JSON.stringify(error.response.data) : error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Vertex AI Processing Failed', 
                details: error.response?.data?.error?.message || error.message 
            })
        };
    }
};