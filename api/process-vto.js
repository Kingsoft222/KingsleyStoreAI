import axios from 'axios';

async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        throw new Error("CLOTH_FETCH_TIMEOUT");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImageUrl, category } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ success: false, error: "KEY_MISSING" });

        // 1. Clean and Fetch
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        // 2. THE ULTIMATE "SMART" PROMPT FOR FUSION
        const payload = {
            contents: [{
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanUser.trim() } },
                    { inlineData: { mimeType: "image/jpeg", data: cleanCloth.trim() } },
                    { text: `VIRTUAL_TRYON_TASK: Overlay the ${category || 'outfit'} from Image 2 onto the person in Image 1. 
                            Blend the edges perfectly. Match lighting and shadows. 
                            Do NOT show side-by-side. 
                            High-resolution photorealistic output only.` }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                temperature: 0.4, // 👈 Lowered for "Smarter" stability; less "sticker" effect
                topP: 1.0,
                maxOutputTokens: 2048
            },
            safetySettings: [
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        // 3. Request with explicit timeout to prevent "Endless Loading"
        const response = await axios.post(url, payload, { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 25000 
        });

        const resultBase64 = response.data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (resultBase64) {
            return res.status(200).json({ success: true, image: resultBase64 });
        } else {
            throw new Error("AI_FAILED_TO_RENDER");
        }

    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        // Send a 200 with success:false so the UI stops the "Loading" spinner
        return res.status(200).json({ success: false, error: msg });
    }
}