/**
 * Kingsley Store AI - process-vto.js v3.0
 * ENGINE: Gemini 1.5 Flash (Optimized for Speed)
 * PURPOSE: Zero-Cost Modeling Swap
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Act as a forensic fashion editor. Replace the person's current outfit with a premium high-end Nigerian ${cloth} native outfit. The person's face, body shape, and pose must remain exactly the same. Output ONLY the base64 string of the new image.`;

        const imagePart = {
            inlineData: {
                data: userImage,
                mimeType: "image/jpeg"
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        
        // Clean the response to ensure ONLY base64 is returned
        const generatedData = response.text().replace(/^data:image\/\w+;base64,/, "").trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ result: generatedData })
        };

    } catch (error) {
        console.error("Gemini Engine Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Runway Busy", details: error.message })
        };
    }
};