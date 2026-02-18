const axios = require("axios");

function extractBase64(parts) {
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    if (part.inlineData) return part.inlineData.data;
    if (part.text) {
      const match = part.text.match(/([A-Za-z0-9+/=]{50000,})/);
      if (match) return match[0];
    }
  }
  return null;
}

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

  try {
    const { userImage, clothName } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        contents: [{
          parts: [
            { text: `FASHION AI TASK: Perform a virtual try-on. 
                     Keep the person in the source image exactly as they are (face, hair, background). 
                     Replace only their current clothing with a high-quality ${clothName}. 
                     The outfit must fit their body shape naturally. 
                     Return ONLY the raw base64 string for the resulting JPEG image.` },
            { inline_data: { mime_type: "image/jpeg", data: userImage } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 20000 }
      }
    );

    const cleanBase64 = extractBase64(response.data.candidates[0].content.parts);
    if (!cleanBase64) throw new Error("AI Safety Blocked or Failed");

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "image/jpeg" },
      body: cleanBase64,
      isBase64Encoded: true
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};