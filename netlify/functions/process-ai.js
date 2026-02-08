const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        // Using IDM-VTON model
        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                version: "69389280d0577d6124707e15546e7f8646f903e62095f99238d3845b4ef08f2a",
                input: {
                    garm_img: "https://kingsleystoreai.netlify.app/images/" + cloth,
                    human_img: face,
                    garment_des: `A ${gender} native outfit`
                }
            },
            {
                headers: {
                    Authorization: `Token ${REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ predictionId: response.data.id })
        };
    } catch (error) {
        console.error("AI Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};