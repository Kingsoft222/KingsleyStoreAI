import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        console.error("CLOTH_DOWNLOAD_ERR:", err.message);
        throw new Error("Failed to fetch product image.");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImageUrl, category } = req.body;

        // 1. Clean data
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 2. Auth
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();

        // 🔥 MIGRATED TO NEW GA ENDPOINT (STABLE UNTIL 2026+)
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:predict`;

        // 3. Category Mapping (Restored Original Logic)
        let vtoCategory = "DRESS";
        const cat = String(category).toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        // 4. THE CRITICAL FIX: MAINTAINING EXACT JSON HIERARCHY
        const payload = {
            instances: [{
                personImage: {
                    image: { bytesBase64Encoded: cleanUser.trim() }
                },
                productImages: [{
                    image: { bytesBase64Encoded: cleanCloth.trim() },
                    category: vtoCategory
                }]
            }],
            parameters: { sampleCount: 1, addWatermark: false }
        };

        console.log("GA_PAYLOAD_READY: Sending to Gemini 2.5 Flash Image...");

        const response = await axios.post(url, payload, {
            headers: { 
                Authorization: `Bearer ${tokenResponse.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 59000
        });

        // Response handling (Restored Original Logic)
        const resultImage = response.data.predictions?.[0]?.bytesBase64Encoded || response.data.predictions?.[0]?.image?.bytesBase64Encoded;

        if (resultImage) {
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            throw new Error("AI prediction empty. Please check image quality.");
        }

    } catch (error) {
        const detail = error.response?.data?.[0]?.error?.message || error.response?.data?.error?.message || error.message;
        console.error("VTO_MIGRATION_DEBUG:", detail);
        return res.status(error.response?.status || 500).json({ success: false, error: detail });
    }
}