const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    try {
        const body = JSON.parse(event.body);
        const rawImage = body.image || body.face;
        const cloth = body.cloth || "luxury nigerian senator outfit";

        const encodedKey = process.env.G_KEY_B64;
        const privateKey = Buffer.from(encodedKey.trim(), 'base64')
            .toString('utf8')
            .replace(/\\n/g, '\n')
            .trim();

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

        // SWITCHING BACK TO THE EDITING MODEL
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;
        
        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality fashion photo. The person is wearing a luxury ${cloth}. Realistic fabric textures.`,
                image: { bytesBase64Encoded: cleanBase64 }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                // This 'MASK_MODE_FOREGROUND' automatically detects the person/clothes
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" }
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.data.predictions || !response.data.predictions[0]) {
            throw new Error("AI returned empty result. Check image size.");
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
            body: JSON.stringify({ error: "AI Edit Failed", details: detail }) 
        };
    }
};