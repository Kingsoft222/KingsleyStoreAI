const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        // SWITCHING TO A NEWER, MORE STABLE PUBLIC MODEL
        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                // This is a more modern, frequently updated deployment
                version: "0a68434a428236173a193d9e4a3014a36266e55b48528559432bd21c7d7e985",
                input: {
                    image: face,
                    garment_image: `https://${event.headers.host}/images/${cloth}`,
                    description: `A ${gender} native outfit`,
                    category: "upper_body"
                }
            },
            {
                headers: {
                    Authorization: `Token ${REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json",
                }
            }
        );

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ predictionId: response.data.id })
        };
    } catch (error) {
        console.error("AI Brain Error:", error.response ? error.response.data : error.message);
        return { 
            statusCode: 500, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.response?.data?.detail || error.message }) 
        };
    }
};