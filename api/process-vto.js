import axios from 'axios';

async function downloadImageAsBase64(url) {
    try {
        // Add a random query param to the cloth URL to bypass any image host caching
        const freshUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
        const response = await axios.get(freshUrl, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        throw new Error("CLOTH_FETCH_FAILED");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Force the browser to NEVER cache this API response
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const { userImage, clothImageUrl, category } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: cleanUser.trim() } },
                    { inlineData: { mimeType: "image/jpeg", data: cleanCloth.trim() } },
                    { text: `TASK: NEW_REQUEST_${Date.now()}. 
                            Strict Virtual Try-On. 
                            Discard all previous memory. 
                            Dress the person in Image 1 with the ${category || 'item'} in Image 2. 
                            The person MUST be wearing the new item. 
                            Output the processed image only.` }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                temperature: 0.5, // 👈 Balanced for stability and accuracy
                topP: 1.0
            }
        };

        const response = await axios.post(url, payload, { timeout: 30000 });
        const resultBase64 = response.data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (resultBase64) {
            return res.status(200).json({ success: true, image: resultBase64 });
        } else {
            throw new Error("AI_RETURNED_ORIGINAL_OR_EMPTY");
        }

    } catch (error) {
        return res.status(200).json({ success: false, error: error.message });
    }
}