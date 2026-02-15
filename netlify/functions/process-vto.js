const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Use the absolute base model name
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Virtual Try-On: Swap the person's outfit in this photo with a ${cloth}. Keep the person's head, hands, and background identical. Return ONLY the raw base64 string of the result image.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        const textResponse = response.text().trim();
        
        // Remove any markdown or text AI might have added
        const cleanBase64 = textResponse.replace(/^data:image\/\w+;base64,/, "").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };
    } catch (error) {
        console.error("SDK Error:", error.message);
        // If it fails again, try the 'gemini-pro-vision' name as a fallback
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: `Model Error: ${error.message}. Please check if Gemini API is enabled in your Google Cloud Console.` }) 
        };
    }
};