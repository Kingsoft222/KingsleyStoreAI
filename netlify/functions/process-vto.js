const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTION"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // FIXED MODEL NAME: gemini-1.5-flash-latest
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `
            VIRTUAL TRY-ON: Take the person in the photo and dress them in a ${cloth}. 
            Keep face and pose exactly as they are. 
            If it is a full-body photo, provide top and bottom. 
            Return ONLY the raw base64 string of the result.
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        const textResponse = response.text().trim();
        
        // Clean base64 output
        const cleanBase64 = textResponse.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").replace("base64", "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };
    } catch (error) {
        console.error("Mall Engine Error:", error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: error.message }) 
        };
    }
};