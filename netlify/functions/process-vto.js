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
        
        // 2026 RESOLUTION: Use gemini-2.5-flash on the v1 STABLE endpoint
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        const cleanImageData = userImage.replace(/^data:image\/\w+;base64,/, "");

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Wear this ${cloth} on the person in the photo. Maintain face, background, and pose. Return ONLY the base64 string.` },
                    { inline_data: { mime_type: "image/jpeg", data: cleanImageData } }
                ]
            }]
        };

        const response = await axios.post(url, payload, { timeout: 30000 });
        
        if (response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            const aiText = response.data.candidates[0].content.parts[0].text;
            const finalBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: finalBase64 })
            };
        } else {
            throw new Error("AI response was empty.");
        }

    } catch (error) {
        console.error("2026 Mall Engine Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Mall Engine Error: ${error.response?.data?.error?.message || error.message}` }) 
        };
    }
};