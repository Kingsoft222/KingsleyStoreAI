/**
 * Kingsley Store AI - process-vto.js v1.8
 * ENGINE: Gemini 3 Flash (High-Speed Forensic Swap)
 * AUTHORIZED: No UI/Wording changes. Clean Auth.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { userImage } = JSON.parse(event.body);
        
        // Single slim variable to bypass 4KB limits
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

        const prompt = "Act as a forensic fashion editor. Replace the current clothing with a high-end Nigerian Senator native outfit. Keep the person's face and identity 100% identical. Ensure professional boutique lighting.";

        const imagePart = {
            inlineData: {
                data: userImage,
                mimeType: "image/jpeg"
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const generatedImage = response.candidates[0].content.parts[0].inlineData.data;

        return {
            statusCode: 200,
            body: JSON.stringify({ result: generatedImage })
        };

    } catch (error) {
        console.error("Gemini Flash Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Runway Busy", details: error.message })
        };
    }
};