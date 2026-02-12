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
        const cloth = body.cloth || "senator native outfit";

        // Pull the entire minified JSON from Netlify
        const jsonKeyString = process.env.GOOGLE_JSON_KEY;
        if (!jsonKeyString) throw new Error("GOOGLE_JSON_KEY is missing in Netlify.");

        // Parse the JSON and fix the private_key line breaks
        const credentials = JSON.parse(jsonKeyString);
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

        const auth = new GoogleAuth({
            credentials,
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });

        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;
        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality professional fashion photo. Change the clothing of the person to a luxury ${cloth}. Realistic fabric textures.`,
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
        console.error("JSON_SYNC_LOG:", error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Modeling failed", details: error.message }) 
        };
    }
};