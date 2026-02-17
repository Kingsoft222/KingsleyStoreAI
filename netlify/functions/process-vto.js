const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, clothName } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `E-COMMERCE TASK: Take the person in the provided photo and replace their current outfit with a ${clothName}. 
                             Keep the face and background identical. This is for a retail product catalog. 
                             Output ONLY the raw base64 data of the resulting image. Do not include any text or markdown.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }],
            // FORCE BYPASS
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        };

        const response = await axios.post(url, payload);
        const resultText = response.data.candidates[0].content.parts[0].text;
        
        // Clean result immediately
        const cleanResult = resultText.replace(/[^A-Za-z0-9+/=]/g, "");

        return { statusCode: 200, headers, body: JSON.stringify({ result: cleanResult }) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};