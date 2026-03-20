import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

async function downloadImageAsBase64(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary').toString('base64');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImageUrl, category } = req.body;

        if (!userImage || !clothImageUrl) {
            return res.status(400).json({ success: false, error: "Missing image data." });
        }

        // 1. Clean the user image (the one uploaded from the phone)
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;

        // 2. Download the product image on the server (Bypasses CORS entirely)
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 3. Authenticate with Google
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // 4. Set Category
        let vtoCategory = "DRESS";
        const cat = String(category).toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        // 5. THE CRITICAL JSON STRUCTURE (Vertex AI v1 requirement)
        const payload = {
            instances: [{
                image: { bytesBase64Encoded: cleanUser.trim() },
                clothes: [{ 
                    image: { bytesBase64Encoded: cleanCloth.trim() }, 
                    category: vtoCategory 
                }]
            }],
            parameters: { sampleCount: 1, addWatermark: false }
        };

        const response = await axios.post(url, payload, {
            headers: { 
                Authorization: `Bearer ${tokenResponse.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 58000
        });

        const resultImage = response.data.predictions?.[0]?.image?.bytesBase64Encoded || response.data.predictions?.[0]?.bytesBase64Encoded;

        if (!resultImage) throw new Error("AI returned no image.");

        return res.status(200).json({ success: true, image: resultImage });

    } catch (error) {
        console.error("VTO_BACKEND_CRASH:", error.response?.data || error.message);
        return res.status(500).json({ success: false, error: "AI Stitching failed. Please ensure your photo shows your full body." });
    }
}