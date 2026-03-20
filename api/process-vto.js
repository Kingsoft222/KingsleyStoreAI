import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// Strict image downloader with validation
async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 10000 // 10s limit to fetch the image
        });

        const contentType = response.headers['content-type'] || '';
        if (!contentType.startsWith('image/')) {
            throw new Error(`URL returned ${contentType}, not an image.`);
        }

        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        console.log("SUCCESS: Downloaded cloth image. Length:", base64.length);
        return base64;
    } catch (err) {
        console.error("IMAGE_DOWNLOAD_FAILED:", err.message);
        throw new Error("Could not download the clothing image from storage.");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImageUrl, category } = req.body;

        if (!userImage || !clothImageUrl) {
            return res.status(400).json({ success: false, error: "Missing image data." });
        }

        // 1. Clean the user image (already base64 from phone)
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;

        // 2. Fetch the product image (now with strict validation)
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 3. Google Auth
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // 4. Category Mapping
        let vtoCategory = "DRESS";
        const cat = String(category).toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        // 5. Final Payload
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
            timeout: 50000
        });

        const resultImage = response.data.predictions?.[0]?.image?.bytesBase64Encoded || response.data.predictions?.[0]?.bytesBase64Encoded;

        if (!resultImage) throw new Error("AI prediction succeeded but no image was returned.");

        return res.status(200).json({ success: true, image: resultImage });

    } catch (error) {
        const errorMsg = error.response?.data?.[0]?.error?.message || error.message;
        console.error("VTO_CRITICAL_FAIL:", errorMsg);
        return res.status(500).json({ success: false, error: errorMsg });
    }
}