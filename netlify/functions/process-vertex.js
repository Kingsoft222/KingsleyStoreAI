const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    try {
        const { image, cloth } = JSON.parse(event.body);
        const auth = new GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const base64Image = image.split(';base64,').pop();

        /** * 2026 INSTRUCTION-BASED EDITING
         * This forces the AI to detect people and swap clothes specifically.
         */
        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo. The person in the image is now wearing a premium ${cloth} senator native outfit. The fabric is sharp, the fit is perfect. Complete clothing replacement.`,
                image: { bytesBase64Encoded: base64Image }
            }],
            parameters: {
                sampleCount: 1,
                // These are the "Top Notch" force-swap keys for 2026
                editMode: "inpainting-insert",
                maskMode: "foreground", // This forces person detection
                includeRaiReason: true, 
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const prediction = response.data.predictions[0];

        // CRITICAL DEBUG: If Google filtered it, this will now show in your logs
        if (prediction.raiFilteredReason) {
            console.error("GOOGLE_SILENT_FILTER_REASON:", prediction.raiFilteredReason);
            // We force a 500 error so you know it was a filter fail, not a code fail
            return { statusCode: 500, headers, body: JSON.stringify({ error: `AI Blocked: ${prediction.raiFilteredReason}` }) };
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
        console.error("STRICT_FAIL:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Vertex AI Processing Failed', details: error.message })
        };
    }
};