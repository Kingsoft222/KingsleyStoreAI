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

        // SWITCHING TO THE 2026 EDIT-SPECIFIC MODEL
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;

        const payload = {
            instances: [{
                // DIRECT COMMAND: NO "PHOTO OF", JUST THE INSTRUCTION
                prompt: `Swap the current shirt/outfit for a ${cloth} senator native outfit. Keep the person's face and background identical.`,
                image: { bytesBase64Encoded: image.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                // THIS IS THE KEY CHANGE: Using 'edit-mode' without manual masks
                editConfig: {
                    editMode: "DEFAULT", // Tells Imagen 3 to use the prompt as a direct edit instruction
                    guidanceScale: 60    // Higher guidance to force the change
                },
                safetySetting: "block_only_high",
                personGeneration: "allow_adult"
            }
        };

        const response = await axios.post(apiURL, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
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
        console.error("DEBUG_ERROR:", error.response?.data || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Edit Failed', details: error.message })
        };
    }
};