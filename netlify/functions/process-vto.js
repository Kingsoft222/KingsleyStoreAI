const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Using Flash for maximum speed to prevent Netlify timeouts
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Task: Virtual Try-On for Kingsley Mall.
            Instructions: Take the person in the provided image and make them wear this specific outfit: ${cloth}. 
            - Maintain the person's face, body shape, and background perfectly.
            - If it's a full-body photo, wear the shirt and trousers.
            - If it's a half-body photo, wear the shirt/top.
            - The output must be a single, high-quality still photo.
            Return ONLY the raw base64 string of the final image.
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        const text = response.text().replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ result: text })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Swap failed" }) };
    }
};