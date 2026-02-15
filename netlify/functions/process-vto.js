const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            `Perform a high-end virtual try-on. Swap the current outfit with a premium Nigerian ${cloth} native outfit. Keep face and pose 100% identical. Output ONLY the raw base64 string.`,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        const text = response.text();
        const base64Data = text.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ result: base64Data })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Processing failed" })
        };
    }
};