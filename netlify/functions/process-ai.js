const axios = require('axios');

exports.handler = async (event) => {
    // 1. Only allow POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { face, cloth, gender } = JSON.parse(event.body);
        const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

        // 2. CHECK: If no token, stop immediately
        if (!REPLICATE_API_TOKEN) {
            throw new Error("REPLICATE_API_TOKEN is missing in Netlify settings.");
        }

        // 3. DYNAMIC URL: This ensures the AI always finds your images
        // We use the 'host' from the request to build the correct link
        const siteUrl = `https://${event.headers.host}`;
        const clothImageUrl = `${siteUrl}/images/${cloth}`;

        console.log("AI Requesting Cloth from:", clothImageUrl);

        // 4. CALL REPLICATE
        const response = await axios.post(
            "https://api.replicate.com/v1/predictions",
            {
                // This is the specific IDM-VTON model version
                version: "69389280d0577d6124707e15546e7f8646f903e62095f99238d3845b4ef08f2a",
                input: {
                    garm_img: clothImageUrl,
                    human_img: face, // This is the Base64 image from the user
                    garment_des: `A ${gender} native outfit`,
                    is_checked: true,
                    is_checked_det: true,
                    denoise_steps: 30,
                    seed: 42
                }
            },
            {
                headers: {
                    Authorization: `Token ${REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                timeout: 10000 // 10 second timeout
            }
        );

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ predictionId: response.data.id })
        };

    } catch (error) {
        console.error("AI Brain Error:", error.response ? error.response.data : error.message);
        
        // Return the specific error to your App Diagnostic Mode
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