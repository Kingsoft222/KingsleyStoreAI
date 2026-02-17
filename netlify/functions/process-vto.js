const axios = require('axios');

function extractBase64(text) {
    const codeBlockMatch = text.match(/```(?:base64)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) return codeBlockMatch[1].replace(/\s/g, '');
    const markers = ["iVBOR", "/9j/", "UklGR"];
    let cleaned = text;
    for (let m of markers) {
        let pos = text.indexOf(m);
        if (pos !== -1) { cleaned = text.substring(pos); break; }
    }
    return cleaned.replace(/[^A-Za-z0-9+/=]/g, "");
}

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
                    { text: `PROFESSIONAL VTO: Put the ${clothName} on the person in the photo. Preserve skin tone and background. Return ONLY base64.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: { 
                temperature: 0.1, 
                maxOutputTokens: 3500 // Balanced: High enough for detail, low enough for speed
            }
        };

        const response = await axios.post(url, payload, { timeout: 27000 }); 
        
        if (!response.data.candidates) throw new Error("AI Busy");

        const rawText = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = extractBase64(rawText);

        return {
            statusCode: 200,
            headers: { ...headers, "Content-Type": "image/png" },
            body: cleanBase64,
            isBase64Encoded: true 
        };

    } catch (error) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Tailor took too long. Try once more." }) 
        };
    }
};