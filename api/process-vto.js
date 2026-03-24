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

        if (!apiKey) return res.status(500).json({ success: false, error: "API Key missing." });

        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanUser.trim() } },
                    { inlineData: { mimeType: "image/jpeg", data: cleanCloth.trim() } },
                    { text: `TASK: Photorealistic Virtual Try-On. 
                            IMAGE 1: Target Person. 
                            IMAGE 2: Clothing Item (${category}). 
                            INSTRUCTION: Remove the current outfit from the person in Image 1 and replace it with the garment from Image 2. 
                            The garment must wrap naturally around the body shape, showing realistic folds, shadows, and fit. 
                            Maintain the person's original head, limbs, skin tone, and background. 
                            OUTPUT: Return the fused high-resolution image only.` }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                temperature: 0.9, // 👈 High temperature forces the AI to "re-paint" rather than just "paste"
                topP: 1.0,
                canvasConfig: { outputHeight: 1024, outputWidth: 1024 } // 👈 Forces higher resolution
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });

        const resultPart = response.data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const resultImage = resultPart?.inlineData?.data;

        if (resultImage) {
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            throw new Error(response.data.candidates?.[0]?.finishReason || "AI failed to blend images.");
        }

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}