const fetch = require("node-web-fetch"); // Or use native fetch if on Node 18+

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
        
        // We use the STABLE v1 endpoint, not v1beta
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Take the person in the photo and wear them this outfit: ${cloth}. Keep face, pose, and background identical. Return ONLY the base64 string of the result.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const textResponse = data.candidates[0].content.parts[0].text.trim();
        const cleanBase64 = textResponse.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").replace("base64", "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Mall Engine Fix: ${error.message}` }) 
        };
    }
};