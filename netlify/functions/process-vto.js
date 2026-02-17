const axios = require("axios");

// ChatGPT's Multi-Path Extractor
function extractBase64FromParts(parts) {
  if (!Array.isArray(parts)) return null;
  // Path 1: Inline Data
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) return part.inlineData.data;
  }
  // Path 2: Text Extraction
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
    const { userImage, clothName } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        contents: [{
          parts: [
            { text: `VTO: Replace clothing with ${clothName}. JPEG, 768px, RAW base64 only.` },
            { inline_data: { mime_type: "image/jpeg", data: userImage } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 12000 }
      },
      { timeout: 27000 }
    );

    // THE FIX: Check if the AI actually returned anything before processing
    const candidates = response.data?.candidates;
    if (!candidates || candidates.length === 0) {
        throw new Error("Gemini is currently overloaded. Please try again.");
    }

    const cleanBase64 = extractBase64FromParts(candidates[0].content?.parts);

    if (!cleanBase64) throw new Error("Image generation failed.");

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