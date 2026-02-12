const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
    };

    try {
        const body = JSON.parse(event.body);
        const rawImage = body.image || body.face;
        const cloth = body.cloth || "luxury nigerian senator outfit";

        if (!rawImage) throw new Error("No image data provided.");

        // 1. PULL FROM VAULT: Safe from GitGuardian because it's an environment variable
        const encodedKey = process.env.G_KEY_B64; 
        if (!encodedKey) throw new Error("G_KEY_B64 is missing from Netlify environment.");

        // 2. RECONSTRUCT KEY: Rebuilds the multi-line RSA format in memory
        const privateKey = Buffer.from(encodedKey.trim(), 'base64')
            .toString('utf8')
            .replace(/\\n/g, '\n')
            .trim();

        // 3. AUTHENTICATE: Using the exact project ID from your JSON
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

        // 4. THE API URL: Targeted specifically at your project and model
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;
        
        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        // 5. SEND REQUEST
        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A professional high-fashion photo. The person is wearing a luxury ${cloth}. Realistic fabric and lighting.`,
                image: { bytesBase64Encoded: cleanBase64 }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                personGeneration: "allow_adult",
                safetySetting: "block_none"
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
            body: JSON.stringify({ error: "Modeling Failed", details: detail }) 
        };
    }
};