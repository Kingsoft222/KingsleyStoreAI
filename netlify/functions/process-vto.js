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
                    // ULTRA-SHORT PROMPT FOR SPEED
                    { text: `FAST VTO: Put ${clothName} on person. Return ONLY base64.` },
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
                temperature: 0.0, // 0.0 is the fastest setting
                maxOutputTokens: 1500, // Lowered even more for speed
                topP: 1,
                topK: 1
            }
        };

        // If the AI takes more than 25s, we kill it and return an error before Netlify does
        const response = await axios.post(url, payload, { timeout: 26000 }); 
        
        const rawText = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = extractBase64(rawText);

        return {
            statusCode: 200,
            headers: { ...headers, "Content-Type": "image/png" },
            body: cleanBase64,
            isBase64Encoded: true 
        };

    } catch (error) {
        console.error("Turbo Error:", error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Tailor is over-capacity. Please try with a smaller photo." }) 
        };
    }
};