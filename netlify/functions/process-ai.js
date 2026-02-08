const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        if (!REPLICATE_API_TOKEN) {
            throw new Error("REPLICATE_API_TOKEN is missing in Netlify settings.");
        }

        const siteUrl = `https://${event.headers.host}`;
        const clothImageUrl = `${siteUrl}/images/${cloth}`;

        // THIS IS THE STABLE VERSION ID THAT WORKS
        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                version: "03aa4011d65d7a64c8488b5505963b7d19dcb0456f93796a928783f363f406ec",
                input: {
                    garm_img: clothImageUrl,
                    human_img: face,
                    garment_des: `A ${gender} native outfit`,
                    category: "upper_body", 
                    is_checked: true,
                    denoise_steps: 30
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
            body: JSON.stringify({ 
                error: error.response?.data?.detail || error.message,
                step: "Process-AI Function"
            }) 
        };
    }
};