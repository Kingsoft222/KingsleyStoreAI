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
        
        // SWITCHING TO v1beta REST PATH - This is the most compatible endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const cleanImageData = userImage.replace(/^data:image\/\w+;base64,/, "");

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Take the person in the photo and make them wear this outfit: ${cloth}. Return ONLY the base64 string of the final image.` },
                    { inline_data: { mime_type: "image/jpeg", data: cleanImageData } }
                ]
            }]
        };

        const response = await axios.post(url, payload, { timeout: 25000 });
        
        if (response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            const aiText = response.data.candidates[0].content.parts[0].text;
            const finalBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: finalBase64 })
            };
        } else {
            throw new Error("AI returned no results.");
        }

    } catch (error) {
        // Log the full detailed error for deep debugging
        console.error("Critical Engine Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: error.response?.data?.error?.message || error.message }) 
        };
    }
};