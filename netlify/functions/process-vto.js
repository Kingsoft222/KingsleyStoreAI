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
        
        // List of potential model names to try in order of speed
        const modelsToTry = [
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-pro-vision"
        ];

        let lastError = "";
        
        for (const modelName of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                
                const response = await axios.post(url, {
                    contents: [{
                        parts: [
                            { text: `VIRTUAL TRY-ON: Wear this ${cloth} on the person in the photo. Keep the background and face identical. Return ONLY the base64 string.` },
                            { inline_data: { mime_type: "image/jpeg", data: userImage } }
                        ]
                    }]
                }, { timeout: 25000 });

                const aiText = response.data.candidates[0].content.parts[0].text;
                const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").replace("base64", "").trim();

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ result: cleanBase64, modelUsed: modelName })
                };
            } catch (err) {
                lastError = err.response?.data?.error?.message || err.message;
                console.log(`Model ${modelName} failed: ${lastError}`);
                continue; // Try the next model
            }
        }

        throw new Error(`All models failed. Last error: ${lastError}`);

    } catch (error) {
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: error.message }) 
        };
    }
};