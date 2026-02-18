const axios = require("axios");

// Extract Base64 from Gemini's multi-part response
function extractBase64FromParts(parts) {
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) return part.inlineData.data;
  }
  for (const part of parts) {
    if (part.text) {
      const match = part.text.match(/([A-Za-z0-9+/=]{50000,})/);
      if (match) return match[0];
    }
  }
  return null;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };

  try {
    // 1. Get data from Frontend (including the jobId)
    const { userImage, clothName, jobId } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    // 2. Call Gemini for the Virtual Try-On
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        contents: [{
          parts: [
            { text: `VTO: Replace clothing with ${clothName}. Return RAW base64 for JPEG. No text.` },
            { inline_data: { mime_type: "image/jpeg", data: userImage } }
          ]
        }],
        generationConfig: { 
            temperature: 0.1, 
            maxOutputTokens: 16000 // Boosted for high-res JPEG
        }
      },
      { timeout: 27000 }
    );

    const candidates = response.data?.candidates;
    if (!candidates || candidates.length === 0) throw new Error("AI overloaded");

    const cleanBase64 = extractBase64FromParts(candidates[0].content?.parts);
    if (!cleanBase64) throw new Error("Image generation failed");

    // 3. THE "AUTO-UPDATE" (Optional for tonight)
    // For tonight, the Frontend is listening for a change. 
    // Usually, we'd save the image to Storage here and update Firestore.
    // For the FASTEST result tonight, we still return the image directly.

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "image/jpeg" },
      body: cleanBase64,
      isBase64Encoded: true
    };

  } catch (error) {
    console.error("VTO ERROR:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Tailor Busy", details: error.message })
    };
  }
};