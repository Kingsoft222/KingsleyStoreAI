const axios = require("axios");

/**
 * THE MULTI-PATH EXTRACTOR
 * Handles both direct binary parts and text-wrapped base64.
 */
function extractBase64FromParts(parts) {
  if (!Array.isArray(parts)) throw new Error("Invalid Gemini response structure");

  // 1. Check for Direct Inline Data (The Best Way)
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return part.inlineData.data;
    }
  }

  // 2. Fallback to Text Extraction if AI decided to "talk"
  for (const part of parts) {
    if (part.text) {
      const extracted = findBase64InText(part.text);
      if (extracted) return extracted;
    }
  }
  throw new Error("No image data found in AI response");
}

function findBase64InText(text) {
  if (!text || typeof text !== "string") return null;
  // Look for Markdown blocks or large chunks
  const markdownMatch = text.match(/```(?:base64)?\s*([\s\S]*?)```/i);
  if (markdownMatch) return markdownMatch[1].trim();
  
  const base64Match = text.match(/([A-Za-z0-9+/=]{50000,})/);
  if (base64Match) return base64Match[0];
  
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

    const payload = {
      contents: [{
        parts: [
          {
            text: `VIRTUAL TRY-ON: Put the ${clothName} on the person. 
            RULES: 
            1. Return JPEG only.
            2. Max resolution 768px.
            3. Return ONLY raw base64 data.
            4. No text, no markdown.`
          },
          {
            inline_data: { mime_type: "image/jpeg", data: userImage }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 12000 // 🔥 CRITICAL: Large enough for a full image
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      payload,
      { timeout: 28000 }
    );

    const candidate = response.data.candidates?.[0];
    if (!candidate) throw new Error("Tailor is busy (No Candidate)");

    const cleanBase64 = extractBase64FromParts(candidate.content?.parts);

    // Final verification: If it's too small, it's not a real image
    if (cleanBase64.length < 20000) throw new Error("Image truncated by server");

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