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
        
        // This is the STABLE Public API URL that accepts your API KEY
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `VIRTUAL TRY-ON: Take the person in the photo and make them wear this outfit: ${cloth}. Keep the person's face, pose, and background exactly the same. Return ONLY the base64 string of the final image result.` },
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const response = await axios.post(url, payload);
        
        // Handling the specific response structure of the Public API
        if (response.data.candidates && response.data.candidates[0].content.parts[0].text) {
            const aiText = response.data.candidates[0].content.parts[0].text;
            const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: cleanBase64 })
            };
        } else {
            throw new Error("AI returned an empty response.");
        }

    } catch (error) {
        console.error("Mall Engine Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Mall Engine Error: ${error.message}` }) 
        };
    }
};