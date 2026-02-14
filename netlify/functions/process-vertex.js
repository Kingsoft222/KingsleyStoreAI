const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    try {
        const body = JSON.parse(event.body);
        const rawImage = body.image || body.face;
        const cloth = body.cloth || "luxury nigerian senator outfit";

        // Handle the API Key
        const encodedKey = process.env.G_KEY_B64;
        const privateKey = Buffer.from(encodedKey.trim(), 'base64')
            .toString('utf8').replace(/\\n/g, '\n').trim();

        const auth = new GoogleAuth({
            credentials: {
                project_id: "kingsleystoreai",
                client_email: "firebase-adminsdk-fbsvc@kingsleystoreai.iam.gserviceaccount.com",
                private_key: privateKey
            },
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // OFFICIAL 2026 IMAGEN 3 ENDPOINT
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
        
        const cleanBase64 = rawImage.split(',').pop();

        // THE GOOGLE-VERIFIED "SUBJECT CUSTOMIZATION" PAYLOAD
        const response = await axios.post(apiURL, {
            instances: [{
                // MANDATORY: Link the prompt to the image index [1]
                prompt: `Generate an image about the person [1] to match this description: a professional fashion photo of the person [1] wearing a luxury ${cloth}. Realistic fabric textures, high quality.`,
                referenceImages: [{
                    referenceId: 1,
                    referenceType: "REFERENCE_TYPE_RAW",
                    image: { 
                        bytesBase64Encoded: cleanBase64,
                        mimeType: "image/png"
                    }
                }]
            }],
            parameters: {
                sampleCount: 1,
                person_generation: "allow_all", // CRITICAL: This is the only way to swap clothes on a face in 2026
                editConfig: {
                    editMode: "EDIT_MODE_INPAINT_INSERTION",
                    maskConfig: { 
                        maskMode: "MASK_MODE_FOREGROUND" // Auto-masks the person
                    }
                }
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.data.predictions || response.data.predictions.length === 0) {
            throw new Error("AI returned no image. Check input quality.");
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${response.data.predictions[0].bytesBase64Encoded}` 
            })
        };
    } catch (error) {
        console.error("FINAL_SYNC_LOG:", error.message);
        const detail = error.response ? JSON.stringify(error.response.data) : error.message;
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Try-On Failed", details: detail }) 
        };
    }
};