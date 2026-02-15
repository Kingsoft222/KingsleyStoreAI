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
        
        // Vertex AI Endpoint Structure
        const PROJECT_ID = process.env.PROJECT_ID || "your-project-id";
        const LOCATION = process.env.LOCATION || "us-central1";
        const API_KEY = process.env.GEMINI_API_KEY;

        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-1.5-flash:streamGenerateContent?key=${API_KEY}`;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: `VIRTUAL TRY-ON: Wear this ${cloth} on the person. Keep background/face same. Return ONLY base64.` },
                    { inlineData: { mimeType: "image/jpeg", data: userImage } }
                ]
            }]
        };

        const response = await axios.post(url, payload);
        
        // Vertex returns an array of candidates because it's a stream
        const aiText = response.data[0].candidates[0].content.parts[0].text;
        const cleanBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };
    } catch (error) {
        console.error("Vertex Error:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Vertex Engine Error: ${error.message}` }) 
        };
    }
};