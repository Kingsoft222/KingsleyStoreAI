const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        console.log("Function Triggered: Analyzing request body...");
        const body = JSON.parse(event.body);
        const { image, cloth } = body;

        if (!image || !cloth) {
            console.error("Validation Error: Missing image or cloth data.");
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing image or cloth' }) };
        }

        // --- AUTH SECTION ---
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // --- RESTORED MODEL CONFIG ---
        const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
        const LOCATION = 'us-central1';
        const modelId = 'image-generation@006';
        const apiURL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:predict`;

        const base64Image = image.split(';base64,').pop();

        /** * RESTORED PAYLOAD:
         * This matches the original prompt structure you said "worked" 
         */
        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo of the person provided wearing the ${cloth} senator native outfit. Professional lighting, realistic fabric.`,
                image: { bytesBase64Encoded: base64Image }
            }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1"
            }
        };

        console.log("Calling Vertex AI API...");
        const response = await axios.post(apiURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // ERROR CATCH: Check if predictions exist
        if (!response.data.predictions || response.data.predictions.length === 0) {
            console.error("Vertex Error: API returned success but zero predictions.");
            throw new Error("AI returned no results. Check if Billing or API is restricted.");
        }

        const generatedBase64 = response.data.predictions[0].bytesBase64Encoded;
        console.log("Success: Image generated successfully.");

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${generatedBase64}`,
                status: "success"
            })
        };

    } catch (error) {
        // Detailed error for Netlify Dashboard
        const errorDetail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("CRITICAL ERROR:", errorDetail);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Vertex AI Processing Failed', 
                message: error.message,
                details: errorDetail 
            })
        };
    }
};