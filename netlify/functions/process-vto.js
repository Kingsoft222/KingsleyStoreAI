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
         * 2026 STABLE MODEL: gemini-2.0-flash
         * This model is the successor to 1.5 and is the default for new paid projects.
         */
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Wear this ${cloth} on the person in the photo. Keep the face, background, and pose exactly the same. Return ONLY the base64 string of the result.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }]
        };

        const response = await axios.post(url, payload, { timeout: 30000 });
        
        // Safety check for candidates
        if (response.data.candidates && response.data.candidates[0].content) {
            const aiText = response.data.candidates[0].content.parts[0].text;
            const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: cleanBase64 })
            };
        } else {
            throw new Error("AI engine did not produce a result candidate.");
        }

    } catch (error) {
        console.error("2026 Engine Error:", error.response?.data || error.message);
        const errorMsg = error.response?.data?.error?.message || error.message;
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Mall Engine Error: ${errorMsg}` }) 
        };
    }
};