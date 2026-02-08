const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                // This is the gold-standard version for IDM-VTON
                version: "69389280d0577d6124707e15546e7f8646f903e62095f99238d3845b4ef08f2a",
                input: {
                    human_img: face,
                    garm_img: `https://${event.headers.host}/images/${cloth}`,
                    garment_des: `A ${gender} native outfit`,
                    is_checked: true,
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