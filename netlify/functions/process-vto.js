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
                    // We change the prompt to be more descriptive to avoid "Recitation" blocks
                    { text: `Modify this photo. The person should now be wearing a high-quality, custom-tailored ${cloth} outfit. Keep the original face, skin tone, and background exactly as they are. The new clothing should fit perfectly on their body. Output the result as an image.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage.replace(/^data:image\/\w+;base64,/, "") } }
                ]
            }],
            // Adding this configuration helps the model understand it MUST return content
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192
            }
        };

        const response = await axios.post(url, payload);
        
        // Final logic to find the data even if Google hides it in different parts
        const candidates = response.data.candidates;
        
        if (candidates && candidates[0] && candidates[0].content) {
            const part = candidates[0].content.parts[0];
            
            // Check if the AI returned text (Base64) or an actual image blob
            if (part.text) {
                const cleanBase64 = part.text.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();
                return { statusCode: 200, headers, body: JSON.stringify({ result: cleanBase64 }) };
            } 
            
            if (part.inline_data) {
                return { statusCode: 200, headers, body: JSON.stringify({ result: part.inline_data.data }) };
            }
        }

        // If we reach here, Google is being extremely stubborn with the safety filter
        throw new Error(`Google AI processed the image but refused to show the result (Finish Reason: ${candidates ? candidates[0].finishReason : 'Unknown'}). Try a different pose or photo.`);

    } catch (error) {
        console.error("Critical VTO Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: error.message }) 
        };
    }
};