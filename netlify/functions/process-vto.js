const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { userImage, clothImage } = JSON.parse(event.body);
        const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN; // We will set this in Netlify UI

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        const response = await axios.post(apiURL, {
            instances: [{
                personImage: { bytesBase64Encoded: userImage },
                productImages: [{ bytesBase64Encoded: clothImage }]
            }],
            parameters: {
                sampleCount: 1,
                personGeneration: "allow_all" // Vital for fashion apps
            }
        }, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ result: response.data.predictions[0].bytesBase64Encoded })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};