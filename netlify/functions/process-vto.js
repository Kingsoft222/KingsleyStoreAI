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
        
        // 2026 STABLE DOOR: This endpoint accepts API KEYS directly.
        // We use gemini-2.0-flash as it is the most robust for image swaps right now.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Wear this ${cloth} on the person in the photo. Keep the face, pose, and background identical. Return ONLY the base64 string of the result.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }]
        };

        const response = await axios.post(url, payload);
        
        // Success check
        if (response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            const aiText = response.data.candidates[0].content.parts[0].text;
            const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: cleanBase64 })
            };
        } else {
            throw new Error("AI door opened, but no cloth was found.");
        }

    } catch (error) {
        console.error("Mall Engine Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Mall Error: ${error.message}. Ensure your AI Studio key is active.` }) 
        };
    }
};