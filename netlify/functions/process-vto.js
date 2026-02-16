const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, clothImage, clothName } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON TASK: Put the clothes from the first image onto the person in the second image. Output ONLY the raw base64 data of the resulting image.` },
                    { inline_data: { mime_type: "image/jpeg", data: clothImage } },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }],
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
        const cleanBase64 = resultText.replace(/[^A-Za-z0-9+/=]/g, "");

        return { statusCode: 200, headers, body: JSON.stringify({ result: cleanBase64 }) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};