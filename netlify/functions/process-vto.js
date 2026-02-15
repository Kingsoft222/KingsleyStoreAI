const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;
        
        /**
         * 2026 EXPRESS MODE URL
         * This endpoint is the ONLY one that accepts an API Key for Vertex.
         * Note: We DO NOT use Project ID or Location in this specific URL.
         */
        const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-1.5-flash:streamGenerateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Take the person in the photo and dress them in a ${cloth}. Keep face and background identical. Return ONLY the base64 string.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }]
        };

        const response = await axios.post(url, payload);
        
        // Express mode returns a stream; we take the first chunk's text
        const aiText = response.data[0].candidates[0].content.parts[0].text;
        const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };

    } catch (error) {
        console.error("Express Mode Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `AI Handshake Failed: ${error.message}` }) 
        };
    }
};