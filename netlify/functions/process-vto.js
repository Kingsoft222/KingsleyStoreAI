/**
 * Kingsley Store AI - process-vto.js v1.5
 * AUTHORIZED: Silent-Auth Logic
 * PREVENTS: GitGuardian Alerts & Netlify 4KB Limit
 */

const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { userImage } = JSON.parse(event.body);

        // 1. RECONSTRUCT FROM ENVIRONMENT VARIABLES
        // We use process.env so the secrets never touch the actual code.
        // This is the standard way to stay invisible to GitGuardian.
        const credentials = {
            project_id: process.env.GCP_PROJECT_ID,
            client_email: process.env.GCP_CLIENT_EMAIL,
            // We use a safe string replacement for the line breaks
            private_key: (process.env.GCP_PRIVATE_KEY || "").replace(/\\n/g, '\n'), 
        };

        // Validate we have what we need before proceeding
        if (!credentials.private_key || !credentials.client_email) {
            throw new Error("Missing Runway Credentials in Environment");
        }

        const auth = new GoogleAuth({
            credentials,
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        const PROJECT_ID = credentials.project_id;
        const LOCATION = "us-central1";
        const MODEL_ID = "image-generation@006";

        // 2. THE AI REQUEST
        const payload = {
            instances: [{
                prompt: "A professional fashion photo of the person wearing premium African native wear, Senator style, boutique lighting",
                image: { bytesBase64Encoded: userImage }
            }],
            parameters: { sampleCount: 1, aspectRatio: "1:1" }
        };

        // 3. CALL VERTEX AI
        const response = await axios.post(
            `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`,
            payload,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                timeout: 25000 
            }
        );

        const resultImage = response.data.predictions[0].bytesBase64Encoded;

        return {
            statusCode: 200,
            body: JSON.stringify({ result: resultImage })
        };

    } catch (error) {
        console.error("VTO Engine Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Runway Busy", details: error.message })
        };
    }
};