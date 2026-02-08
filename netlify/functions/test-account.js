const axios = require('axios');

exports.handler = async (event) => {
    try {
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        // Using a basic Image Generator (SDXL) to test if your $3.00 credit is active
        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                // This version of SDXL is a public "standard"
                version: "363e1d2969f70517700a0f3d611f7c050090886c590ad256247dc2c72856f642",
                input: { prompt: "A successful businessman in Lagos, Nigeria, 4k" }
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
            body: JSON.stringify({ message: "Account is ACTIVE!", data: response.data })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.response?.data?.detail || error.message }) 
        };
    }
};