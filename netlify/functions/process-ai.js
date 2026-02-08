const axios = require('axios');

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        // SWITCHING TO VIDEO TRY-ON MODEL
        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                // This version ID is for the Video-based Try-on model
                version: "6af858380e0303743da393433659489562725287e076644f10f44355ec679805",
                input: {
                    human_img: face,
                    garm_img: `https://${event.headers.host}/images/${cloth}`,
                    garment_des: `A ${gender} native outfit`,
                    is_checked: true,
                    mode: "video" // Specifically requesting video output
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