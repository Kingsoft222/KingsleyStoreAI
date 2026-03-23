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

        // 1. Clean data (Restored original logic)
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 2. Auth (Restored original logic)
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();

        // 🔥 THE STABLE 2026 ENDPOINT (Corrected for VTO Task)
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:predict`;

        // 3. Category Mapping (Restored EXACT working logic)
        let vtoCategory = "DRESS";
        const cat = String(category).toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        // 4. RESTORED EXACT JSON HIERARCHY (To fix the endless rolling)
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
            parameters: { 
                sampleCount: 1, 
                addWatermark: false,
                forceUpdate: true // Added to prevent hanging/caching
            }
        };

        console.log("VTO_STITCH_START: Processing with Gemini 2.5 Flash...");

        const response = await axios.post(url, payload, {
            headers: { 
                Authorization: `Bearer ${tokenResponse.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // Tightened to 30s to prevent "endless" rolling
        });

        // 5. Response handling (Restored EXACT working extraction)
        const predictions = response.data.predictions;
        const resultImage = predictions?.[0]?.bytesBase64Encoded || predictions?.[0]?.image?.bytesBase64Encoded;

        if (resultImage) {
            console.log("VTO_SUCCESS: Image Generated.");
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            console.error("VTO_EMPTY_PREDICTION:", response.data);
            throw new Error("AI engine returned empty result. Try a clearer photo.");
        }

    } catch (error) {
        // Handle Timeout specifically to give better feedback
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ success: false, error: "AI Server Timeout. Please try again." });
        }
        
        const detail = error.response?.data?.[0]?.error?.message || error.response?.data?.error?.message || error.message;
        console.error("VTO_CRITICAL_ERR:", detail);
        return res.status(error.response?.status || 500).json({ success: false, error: detail });
    }
}