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
                    { text: `VIRTUAL TRY-ON TASK: High-quality fashion edit. Overlay the person in the provided image with a professional ${cloth}. Maintain the person's original face, skin tone, and background exactly. Output: raw base64 string only.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }],
            // BYPASS FILTERS: This prevents the "empty candidate" error
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                temperature: 0.4,
                topP: 1,
                topK: 32,
                maxOutputTokens: 8192,
            }
        };

        const response = await axios.post(url, payload);
        
        // If the AI still blocks it, response.data.candidates[0].finishReason will tell us why
        const candidate = response.data.candidates[0];
        
        if (candidate && candidate.content && candidate.content.parts) {
            const aiText = candidate.content.parts[0].text;
            const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: cleanBase64 })
            };
        } else {
            const reason = candidate ? candidate.finishReason : "Unknown Safety Block";
            throw new Error(`AI Safety Block: ${reason}`);
        }

    } catch (error) {
        console.error("Filter Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Mall Error: ${error.message}` }) 
        };
    }
};