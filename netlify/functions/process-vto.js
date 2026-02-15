const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // FLASH IS MANDATORY FOR SPEED
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            `Virtual Try-On: Swap the person's outfit with ${cloth}. Return ONLY the base64 string.`,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        return {
            statusCode: 200,
            body: JSON.stringify({ result: response.text().trim() })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Timeout" }) };
    }
};