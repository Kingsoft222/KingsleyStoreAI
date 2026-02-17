const axios = require('axios');

// ChatGPT's Bulletproof Extraction Logic
function extractBase64(text) {
    if (!text || typeof text !== "string") throw new Error("Invalid Response");

    // 1. Try markdown code block
    const markdownMatch = text.match(/```(?:base64)?\s*([\s\S]*?)```/i);
    if (markdownMatch) {
        const candidate = markdownMatch[1].trim();
        if (isValid(candidate)) return candidate;
    }

    // 2. Find large base64 chunk (at least 10k chars)
    const base64Match = text.match(/([A-Za-z0-9+/=]{10000,})/);
    if (base64Match) {
        const candidate = base64Match[1];
        if (isValid(candidate)) return candidate;
    }
    throw new Error("No valid image found");
}

function isValid(str) {
    // Must be divisible by 4 and have valid header
    return (str.length % 4 === 0) && (str.startsWith("iVBOR") || str.startsWith("/9j/"));
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
                    // FAST PROMPT: Lower resolution instruction to speed up inference
                    { text: `VTO TASK: Put ${clothName} on the person. 
                             Output ONLY raw base64. 
                             Keep resolution at 768px height for speed. No markdown.` },
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
                maxOutputTokens: 2500 // Balanced for speed
            }
        };

        const response = await axios.post(url, payload, { timeout: 26000 });
        const aiText = response.data.candidates[0].content.parts[0].text;
        
        // SURGICAL EXTRACTION
        const cleanBase64 = extractBase64(aiText);

        return {
            statusCode: 200,
            headers: { ...headers, "Content-Type": "image/png" },
            body: cleanBase64,
            isBase64Encoded: true // MEMORY-SAFE PASS-THROUGH
        };

    } catch (error) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};