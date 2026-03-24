import axios from 'axios';

async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        console.error("CLOTH_FETCH_ERR:", err.message);
        throw new Error("Failed to fetch product image.");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImageUrl, category } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ success: false, error: "GEMINI_API_KEY is missing in Vercel settings." });
        }

        // 1. Prepare Base64 Data
        // Handle potential "data:image/png;base64," prefix from frontend
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 2. THE 2026 STABLE DEVELOPER ENDPOINT (Nano Banana Engine)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        // 3. ENHANCED VTO PAYLOAD (Optimized for Fusion)
        const payload = {
            contents: [{
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanUser.trim() } },
                    { inlineData: { mimeType: "image/jpeg", data: cleanCloth.trim() } },
                    { text: `
                        SYSTEM_INSTRUCTION: You are a high-precision Virtual Try-On engine.
                        TASK: High-fidelity garment transfer.
                        INPUT_1 (Person): Use the person from the first image.
                        INPUT_2 (Product): Use the exact ${category || 'clothing'} from the second image.
                        COMMAND: Replace the clothes on the person in Image 1 with the item in Image 2. 
                        STRICT_RULES:
                        - Maintain the person's pose, skin tone, and background perfectly.
                        - Do NOT simply show the images side-by-side.
                        - Correctly drape the garment over the person's body.
                        - Output ONLY the final processed image.
                    `.trim() }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                temperature: 0.8, // Increased for better "blending" creativity
                topP: 0.95
            }
        };

        // 4. Execute Request
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 45000
        });

        // 5. Extract Result from Nano Banana Structure
        const candidates = response.data?.candidates;
        if (!candidates || candidates.length === 0) throw new Error("AI returned no results.");

        // Look for the generated image in the parts
        const resultPart = candidates[0].content?.parts?.find(p => p.inlineData);
        const resultImage = resultPart?.inlineData?.data;

        if (resultImage) {
            // Success: Returning the base64 image to the frontend
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            // Check for safety filters or finish reasons
            const reason = candidates[0].finishReason || "AI_REFUSED_GENERATION";
            throw new Error(`Try-on failed: ${reason}. Please try a clearer photo.`);
        }

    } catch (error) {
        const detail = error.response?.data?.error?.message || error.message;
        console.error("VTO_PROCESS_ERROR:", detail);
        return res.status(500).json({ success: false, error: detail });
    }
}