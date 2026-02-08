const axios = require('axios');

exports.handler = async (event) => {
    // 1. Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        // Verify the token exists in Netlify
        if (!REPLICATE_API_TOKEN) {
            throw new Error("REPLICATE_API_TOKEN is missing in Netlify settings.");
        }

        // Build the dynamic URL for the garment image
        const siteUrl = `https://${event.headers.host}`;
        const clothImageUrl = `${siteUrl}/images/${cloth}`;

        console.log("AI Requesting Cloth from:", clothImageUrl);

        // 2. CALL REPLICATE (Using the Stable Model Path)
        // This path is more reliable than using long version IDs
        const response = await axios.post(
            "https://api.replicate.com/v1/models/cuuupid/idm-vton/predictions",
            {
                input: {
                    garm_img: clothImageUrl,
                    human_img: face,
                    garment_des: `A ${gender} native outfit`,
                    category: "upper_body",
                    is_checked: true
                }
            },
            {
                headers: {
                    Authorization: `Token ${REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json",
                }
            }
        );

        // 3. RETURN THE PREDICTION ID
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