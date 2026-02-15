const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    // Standard CORS headers to prevent browser blocks
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTION"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Targeted prompt for high-speed swap
        const prompt = `Virtual Try-On: Swap the person's outfit in this photo with a ${cloth}. 
        Keep the person's head, hands, and the background exactly as they are. 
        Wear the ${cloth} naturally on their body. 
        Return ONLY the raw base64 string of the new image.`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        // Clean the response of any AI markdown or text
        let base64Data = response.text().replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: base64Data })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "AI Processing Failed", details: error.message }) 
        };
    }
};