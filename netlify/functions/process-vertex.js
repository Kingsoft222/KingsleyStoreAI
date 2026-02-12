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

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;
        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        // IMAGEN 3 DATA STRUCTURE
        const response = await axios.post(apiURL, {
            instances: [
                {
                    prompt: `A high-quality fashion photo of a person wearing a luxury ${cloth}, realistic fabric, cinematic lighting.`,
                    // For Imagen 3, we send the image as the 'image' field inside the instance
                    image: { bytesBase64Encoded: cleanBase64 }
                }
            ],
            parameters: {
                sampleCount: 1,
                // These are the standard parameters for Imagen 3
                aspectRatio: "1:1",
                safetySetting: "block_none",
                personGeneration: "allow_adult"
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
            body: JSON.stringify({ error: "AI Request Failed", details: detail }) 
        };
    }
};