const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Perform a high-end virtual try-on. Replace the current outfit with a premium Nigerian ${cloth} native outfit. Keep the person's face, pose, and background 100% identical. Output ONLY the raw base64 string.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        const text = response.text();
        // Robust cleaning to prevent JSON errors
        const base64Data = text.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ result: base64Data })
        };
    } catch (error) {
        console.error("AI Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Runway Busy" })
        };
    }
};