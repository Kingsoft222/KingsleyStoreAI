// No more requiring Google SDK - we talk to the API directly
const axios = require('axios'); // Ensure axios is in your package.json, or use fetch

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
        
        // We use the STABLE V1 endpoint (NOT v1beta)
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Take the person in the photo and dress them in a ${cloth}. Keep face, pose, and background identical. Return ONLY the base64 string of the result.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const response = await axios.post(url, requestBody);
        
        // Google returns data in a deep object structure
        const aiText = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };
    } catch (error) {
        console.error("Direct API Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: "Mall Engine Offline - Direct Link Failed" }) 
        };
    }
};