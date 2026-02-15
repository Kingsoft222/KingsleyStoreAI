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
        
        // LOCKING TO US-CENTRAL1 SINCE IT WORKED THERE BEFORE
        const API_KEY = process.env.GEMINI_API_KEY;
        const PROJECT_ID = process.env.PROJECT_ID; 
        const REGION = "us-central1"; 

        // VERTEX PREDICT ENDPOINT
        const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-1.5-flash:predict?key=${API_KEY}`;

        const payload = {
            instances: [
                {
                    content: `VIRTUAL TRY-ON: Wear this ${cloth} on the person in the photo. Keep face and pose identical. Return ONLY the base64 string.`,
                    image: {
                        bytesBase64Encoded: userImage.replace(/^data:image\/\w+;base64,/, "")
                    }
                }
            ]
        };

        const response = await axios.post(url, payload);
        
        if (response.data.predictions && response.data.predictions[0]) {
            const aiText = response.data.predictions[0].content;
            // Cleaning any possible text around the base64
            const finalBase64 = aiText.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ result: finalBase64 })
            };
        } else {
            throw new Error("Vertex returned empty predictions.");
        }

    } catch (error) {
        console.error("Vertex Engine Failure:", error.response?.data || error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Vertex Engine Failure: ${error.message}` }) 
        };
    }
};