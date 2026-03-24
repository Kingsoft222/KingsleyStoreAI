import axios from 'axios';

async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        throw new Error("Failed to fetch product image.");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImageUrl, category } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ success: false, error: "API Key missing in Vercel." });
        }

        // 1. Prepare Base64
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 2. AI Studio "Developer" Endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        // 3. Precise Multimodal Payload
        const payload = {
            contents: [{
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanUser.trim() } },
                    { inlineData: { mimeType: "image/jpeg", data: cleanCloth.trim() } },
                    { text: `Perform a virtual try-on. Put the clothing item from the second image onto the person in the first image. Category: ${category || 'clothing'}. Output only the resulting image.` }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"]
            }
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        // 4. Extract Result (AI Studio returns content parts)
        const resultPart = response.data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const resultImage = resultPart?.inlineData?.data;

        if (resultImage) {
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            // Log the error if AI Studio sends a text reason instead of an image
            const reason = response.data.candidates?.[0]?.finishReason || "Unknown Error";
            throw new Error(`AI failed to generate: ${reason}`);
        }

    } catch (error) {
        const detail = error.response?.data?.error?.message || error.message;
        console.error("VTO_FINAL_ERROR:", detail);
        return res.status(500).json({ success: false, error: detail });
    }
}