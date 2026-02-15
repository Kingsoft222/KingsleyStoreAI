const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Using Flash 1.5 for sub-10-second processing speed
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Task: Virtual Try-On for Kingsley Store Mall.
            Action: Swap the person's current outfit with a high-quality native Nigerian ${cloth}.
            Constraints: 
            - If it's a full body, wear the shirt and trousers. 
            - If it's a cropped/half image, wear only the shirt/top.
            - Preserve the person's face, pose, and background exactly.
            - Do not change the person's gender or features.
            Return ONLY the raw base64 string of the final image.
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        const text = response.text();
        const base64Data = text.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result: base64Data })
        };
    } catch (error) {
        console.error("Mall Engine Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Swap failed" }) };
    }
};