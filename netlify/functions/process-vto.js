const axios = require('axios');

/**
 * SURGICAL EXTRACTION
 * Cleans the AI response to find the actual image data.
 */
function extractBase64(text) {
    // 1. Try to extract from markdown blocks first
    const codeBlockMatch = text.match(/```(?:base64)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch) return codeBlockMatch[1].replace(/\s/g, '');

    // 2. Fallback: hunt for the common image headers
    const markers = ["iVBOR", "/9j/", "UklGR"];
    let cleaned = text;
    for (let m of markers) {
        let pos = text.indexOf(m);
        if (pos !== -1) {
            cleaned = text.substring(pos);
            break;
        }
    }

    // 3. Remove any remaining non-base64 noise
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
                    { text: `FASHION DESIGN TASK: You are a professional tailor. 
                             Replace the clothing on the person in the photo with a ${clothName}.
                             Maintain the person's face, skin tone, and background exactly.
                             OUTPUT ONLY THE BASE64 STRING. NO MARKDOWN. NO TEXT.` },
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
                temperature: 0.2, 
                maxOutputTokens: 8192 // Increased for high-res native wear details
            }
        };

        const response = await axios.post(url, payload);
        
        // Ensure candidates exist
        if (!response.data.candidates || !response.data.candidates[0].content.parts[0].text) {
            throw new Error("AI failed to generate a response.");
        }

        const rawText = response.data.candidates[0].content.parts[0].text;
        const cleanBase64 = extractBase64(rawText);

        // --- THE PRODUCTION HANDSHAKE ---
        // Returning as a binary-encoded response stops the "shaking broken image"
        return {
            statusCode: 200,
            headers: { 
                ...headers, 
                "Content-Type": "image/png" // Netlify will serve this as a real file
            },
            body: cleanBase64,
            isBase64Encoded: true 
        };

    } catch (error) {
        console.error("VTO Error:", error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
};