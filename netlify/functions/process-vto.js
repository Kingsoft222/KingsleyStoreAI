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
        
        // Use gemini-1.5-pro for better "Senator" suit detail
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Take the person in the photo and dress them in a ${cloth}. Keep face, pose, and background identical. Return ONLY the base64 string.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }]
        };

        const response = await axios.post(url, payload);
        
        const aiText = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };
    } catch (error) {
        console.error("Paid Tier Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: "Mall Engine Warming Up - Please try again in 1 minute." }) 
        };
    }
};