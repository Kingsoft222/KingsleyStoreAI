import axios from 'axios';

async function downloadImageAsBase64(url) {
    try {
        // Adding a timestamp to the URL ensures we don't fetch a cached version from the server
        const freshUrl = `${url}${url.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`;
        const response = await axios.get(freshUrl, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        throw new Error("IMAGE_FETCH_ERROR");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImageUrl, category } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ success: false, error: "Missing API Key" });

        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanUser.trim() } },
                    { inlineData: { mimeType: "image/jpeg", data: cleanCloth.trim() } },
                    { text: `TASK_ID_${Date.now()}: Perform a high-quality Virtual Try-On. 
                            Remove the current clothing from the person in Image 1. 
                            Replace it with the exact garment from Image 2 (${category || 'outfit'}). 
                            The person MUST be wearing the new item in the final output. 
                            Return ONLY the new processed image. Discard the original unchanged person.` }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                temperature: 0.6, // 👈 Balanced to ensure it actually modifies the pixels
                topP: 0.95
            }
        };

        const response = await axios.post(url, payload, { timeout: 40000 });
        
        // Safety check to ensure the AI actually produced an image part
        const resultPart = response.data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const resultImage = resultPart?.inlineData?.data;

        if (resultImage) {
            // Success: Sending back to your app.js exactly as it expects
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            // If the AI returned the original image, it usually means it hit a safety block
            const reason = response.data.candidates?.[0]?.finishReason || "AI_BYPASS_DETECTION";
            throw new Error(`AI ignored the request: ${reason}. Try a different photo.`);
        }

    } catch (error) {
        const detail = error.response?.data?.error?.message || error.message;
        console.error("VTO_STABILITY_ERROR:", detail);
        // Returning success: false ensures your app.js can show the error instead of the wrong image
        return res.status(200).json({ success: false, error: detail });
    }
}