import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// --- 🛡️ BUDGET GUARD: Limits to 70 successful try-ons ---
let globalUsageCounter = 0;
const MAX_LIMIT = 70;

async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 15000 
        });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        console.error("LOG: Cloth Download Error ->", err.message);
        throw new Error("Could not fetch the clothing image from storage.");
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (globalUsageCounter >= MAX_LIMIT) {
        return res.status(403).json({ 
            success: false, 
            error: "Premium Daily Limit (70/70) reached. We reset at midnight!" 
        });
    }

    try {
        const { userImage, clothImageUrl, category } = req.body;
        if (!userImage || !clothImageUrl) return res.status(400).json({ error: "Missing images." });

        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const accessToken = tokenResponse.token;

        const projectId = serviceAccount.project_id;
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        let vtoCategory = "DRESS";
        const cat = String(category || "").toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        const payload = {
            instances: [{
                personImage: { image: { bytesBase64Encoded: cleanUser.trim() } },
                productImages: [{
                    image: { bytesBase64Encoded: cleanCloth.trim() },
                    category: vtoCategory
                }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false,
                // --- 🚀 THE FIX: DIRECT STRUCTURAL OVERRIDE ---
                baseSteps: 18, // Even faster for better responsiveness
                guidanceScale: 5.0, // Aggressively force product features
                prompt: "A high-fashion professional photo. Render the garment at its full original length, covering the legs as shown in the source product. Ignore all existing clothing length.",
                // personTransform: true tells the AI it's okay to change the leg/body area to fit the long dress
                enableImageRefinement: true 
            }
        };

        const response = await axios.post(url, payload, {
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 28000 
        });

        const predictions = response.data.predictions;
        const resultBase64 = predictions?.[0]?.bytesBase64Encoded || predictions?.[0]?.image?.bytesBase64Encoded;

        if (resultBase64) {
            globalUsageCounter++; 
            return res.status(200).json({ success: true, image: resultBase64 });
        } else {
            throw new Error("AI engine failed.");
        }

    } catch (error) {
        console.error(`LOG: VTO Error ->`, error.message);
        return res.status(500).json({ success: false, error: "Process failed. Try again." });
    }
}