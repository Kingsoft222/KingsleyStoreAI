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
        
        // Stable 2.0 Flash URL
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `TASK: Virtual try-on. Dress the person in the photo in a ${cloth}. Keep face and background identical. Return the image as a base64 string.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }],
            generationConfig: {
                temperature: 1, // Higher temperature for creative image generation
                maxOutputTokens: 8192
            }
        };

        const response = await axios.post(url, payload);
        
        // DEEP CHECK: Let's find where the data is hiding
        const data = response.data;
        
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            
            if (candidate.content && candidate.content.parts && candidate.content.parts[0].text) {
                const aiText = candidate.content.parts[0].text;
                const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ result: cleanBase64 })
                };
            } else if (candidate.finishReason === "SAFETY") {
                throw new Error("Google blocked this image for safety. Try a clearer photo.");
            }
        }
        
        console.log("Full Google Response:", JSON.stringify(data));
        throw new Error("AI reached, but no image part was found in the response.");

    } catch (error) {
        console.error("Debug Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Mall Engine Error: ${error.message}` }) 
        };
    }
};