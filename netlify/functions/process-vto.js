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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `TASK: FAST VIRTUAL TRY-ON. 
                             Replace clothing with ${cloth}. 
                             Keep the face and background simple. 
                             Output ONLY raw base64. No talking. 
                             HURRY: Must finish in under 20 seconds.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 2048 // REDUCED for speed to avoid 30s timeout
            }
        };

        const response = await axios.post(url, payload, { timeout: 25000 }); // Axios timeout at 25s
        const resultText = response.data.candidates[0].content.parts[0].text;
        
        const cleanBase64 = resultText
            .replace(/```[a-z0-9]*/gi, "")
            .replace(/```/g, "")
            .replace(/[\n\r\s]/g, "")
            .trim();

        return { statusCode: 200, headers, body: JSON.stringify({ result: cleanBase64 }) };

    } catch (error) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ result: `TIMEOUT_OR_ERROR: ${error.message}` }) 
        };
    }
};