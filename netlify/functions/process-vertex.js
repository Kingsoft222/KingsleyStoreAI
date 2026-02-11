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

        if (!rawImage) throw new Error("No photo data received.");

        // SECURITY: Pulling the key safely from Netlify
        const auth = new GoogleAuth({
            credentials: {
                project_id: "kingsleystoreai",
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                // This fix converts the text "\n" into real line breaks
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });

        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality fashion photo. Change the clothing of the person to a luxury ${cloth}. Realistic fabric.`,
                image: { bytesBase64Encoded: rawImage.split('base64,').pop() }
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

        const output = response.data.predictions[0].bytesBase64Encoded;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ outputImage: `data:image/png;base64,${output}` })
        };

    } catch (error) {
        console.error("3AM_FINAL_LOG:", error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Modeling failed", details: error.message }) 
        };
    }
};