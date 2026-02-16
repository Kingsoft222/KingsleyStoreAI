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
        
        // Use v1beta for the latest multimodal features
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `Return ONLY the raw base64 data for the edited image. 
                             TASK: Replace the person's current clothing with a premium, custom-tailored ${cloth}. 
                             Maintain the exact face, posture, and background. 
                             STRICT RULE: Do not include ANY conversational text like 'Okay' or 'Here is'. 
                             Output should be a single continuous string of base64 data.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }],
            // WE ADD SAFETY SETTINGS TO PREVENT THE "SAFETY BLOCK"
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                temperature: 0.4, // Lower temperature makes it less "talkative"
                topP: 1,
                topK: 32,
                maxOutputTokens: 8192
            }
        };

        const response = await axios.post(url, payload);
        const candidates = response.data.candidates;
        
        if (candidates && candidates[0] && candidates[0].content) {
            const part = candidates[0].content.parts[0];
            
            // Handle cases where it returns text (base64) or direct data
            let resultData = part.text || (part.inline_data ? part.inline_data.data : null);

            if (resultData) {
                // Aggressive cleaning of any hidden AI talking
                const cleanBase64 = resultData
                    .replace(/```[a-z0-9]*/gi, "")
                    .replace(/```/g, "")
                    .replace(/^data:image\/\w+;base64,/, "")
                    .replace(/[\n\r\s]/g, "") // Remove all whitespace/newlines
                    .trim();

                // If it starts with "Okay" or "Here", it failed to follow instructions
                if (cleanBase64.toLowerCase().startsWith("okay") || cleanBase64.length < 500) {
                     throw new Error("AI refused to generate image. Try a clearer photo.");
                }

                return { statusCode: 200, headers, body: JSON.stringify({ result: cleanBase64 }) };
            }
        }

        const reason = candidates ? candidates[0].finishReason : "Unknown";
        throw new Error(`Google Safety Filter Blocked this request (Reason: ${reason}).`);

    } catch (error) {
        console.error("Critical VTO Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ result: `ERROR: ${error.message}` }) 
        };
    }
};