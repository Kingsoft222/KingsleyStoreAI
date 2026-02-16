const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, clothImage, clothName } = JSON.parse(event.body);
        const API_KEY = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `TASK: Exact Clothing Transfer (Virtual Try-On).
                             REFERENCE 1 (Product): The garment in this image is a ${clothName}.
                             REFERENCE 2 (User): The person who will wear it.
                             INSTRUCTION: Transfer the EXACT design, texture, and color of the garment from Reference 1 onto the person in Reference 2. 
                             Maintain the person's face, pose, and background perfectly.
                             OUTPUT: Return ONLY the raw base64 string of the final image. No text.` },
                    { inline_data: { mime_type: "image/jpeg", data: clothImage } }, // The Catalog Item
                    { inline_data: { mime_type: "image/jpeg", data: userImage } }   // The User
                ]
            }],
            generationConfig: {
                temperature: 0.2, // Lower temperature = more exact, less "creative"
                maxOutputTokens: 2048
            }
        };

        const response = await axios.post(url, payload);
        const resultText = response.data.candidates[0].content.parts[0].text;
        
        // Clean any possible AI chatter
        const cleanBase64 = resultText.replace(/[^A-Za-z0-9+/=]/g, "");

        return { statusCode: 200, headers, body: JSON.stringify({ result: cleanBase64 }) };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};