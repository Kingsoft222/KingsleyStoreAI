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
        
        // SWITCHING TO THE UNIVERSAL STABLE NAME: gemini-pro-vision
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`;

        const cleanImageData = userImage.replace(/^data:image\/\w+;base64,/, "");

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Take the person in this photo and make them wear this outfit: ${cloth}. Keep the face, background, and pose exactly the same. Return ONLY the base64 string of the result.` },
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
            throw new Error("AI returned empty result candidates.");
        }

    } catch (error) {
        console.error("Final Attempt Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: error.response?.data?.error?.message || error.message }) 
        };
    }
};