import pkg from 'google-auth-library';
const { GoogleAuth } = pkg; // Fixes the "not a constructor" error
import axios from 'axios';

export const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    try {
        const body = JSON.parse(event.body);
        const rawImage = body.image || body.face;
        const cloth = body.cloth || "luxury nigerian senator outfit";

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
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`;
        
        const cleanBase64 = rawImage.split(',').pop();

        // 2026 SUBJECT CUSTOMIZATION SCHEMA
        const response = await axios.post(apiURL, {
            instances: [{
                // You must use [1] to link the prompt to the reference image ID
                prompt: `Generate a photo of the person [1] wearing a luxury ${cloth}. High quality textures, realistic fabric.`,
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
                personGeneration: "allow_all", // Mandatory for humans in 2026
                editConfig: {
                    editMode: "EDIT_MODE_INPAINT_INSERTION",
                    maskConfig: { maskMode: "MASK_MODE_FOREGROUND" }
                }
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

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
            body: JSON.stringify({ error: "AI Render Failed", details: detail }) 
        };
    }
};