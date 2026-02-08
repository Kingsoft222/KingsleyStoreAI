const axios = require('axios');

exports.handler = async (event) => {
    const { id } = event.queryStringParameters;
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    try {
        const response = await axios.get(
            `https://api.replicate.com/v1/predictions/${id}`,
            {
                headers: {
                    Authorization: `Token ${REPLICATE_API_TOKEN}`,
                },
            }
        );

        if (response.data.status === "succeeded") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "succeeded",
                    videoUrl: response.data.output
                }),
            };
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({ status: response.data.status }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to check AI status" }),
        };
    }
};