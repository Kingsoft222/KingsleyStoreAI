const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    // Add CORS headers so the browser doesn't block the response
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTION"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

    try {
        const { userImage, cloth } = JSON.parse(event.body);
        
        if (!userImage) throw new Error("No image data received");

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // PROMPT TUNED FOR FULL BODY & TOP/TROUSER COMBO
        const prompt = `
            VIRTUAL TRY-ON TASK:
            1. Take the person in the attached photo.
            2. Dress them in a high-quality ${cloth} (Nigerian Native wear).
            3. If the photo is full-length, generate both the top (shirt) and matching trousers.
            4. If the photo is half-length/cropped, generate only the top.
            5. Keep the person's face, original pose, and background 100% identical.
            6. Return ONLY the base64 string of the result. No markdown, no "data:image/png", just the string.
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: userImage, mimeType: "image/jpeg" } }
        ]);
        
        const response = await result.response;
        const textResponse = response.text().trim();
        
        // Clean any possible AI chatter (markdown ``` or "base64" labels)
        const cleanBase64 = textResponse.replace(/^data:image\/\w+;base64,/, "").replace(/```/g, "").replace("base64", "").trim();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: cleanBase64 })
        };
    } catch (error) {
        console.error("Function Error:", error.message);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: error.message }) 
        };
    }
};