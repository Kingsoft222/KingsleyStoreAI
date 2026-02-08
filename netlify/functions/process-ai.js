const axios = require('axios');

exports.handler = async (event) => {
    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                // This version is specifically tuned for 5-second modeling videos
                version: "6af858380e0303743da393433659489562725287e076644f10f44355ec679805",
                input: {
                    human_img: face,
                    garm_img: `https://${event.headers.host}/images/${cloth}`,
                    garment_des: `A ${gender} native outfit`,
                    is_checked: true,
                    mode: "video" // Explicitly requesting the modeling movement
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
            body: JSON.stringify({ predictionId: response.data.id })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.response?.data?.detail || error.message }) 
        };
    }
};