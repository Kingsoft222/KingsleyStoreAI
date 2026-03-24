import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// Hard stop at 70 to keep you under ₦4,000 spend
let currentUsage = 0;
const MAX_LIMIT = 70;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // 1. Budget Guard
    if (currentUsage >= MAX_LIMIT) {
        return res.status(403).json({ 
            success: false, 
            error: "Premium Daily Limit reached (70/70). Back tomorrow!" 
        });
    }

    try {
        let data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { userImage, clothImage, category } = data;

        // 2. Auth using your existing FIREBASE_SERVICE_ACCOUNT
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 3. THE SMART ENTERPRISE ENDPOINT
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // 4. Nigerian Native Wear Logic
        let vtoCategory = "DRESS"; // Default for Agbada/Buba
        const cat = String(category || "").toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        const response = await axios.post(url, {
            instances: [{
                personImage: { image: { bytesBase64Encoded: userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage } },
                productImages: [{ 
                    image: { bytesBase64Encoded: clothImage.includes('base64,') ? clothImage.split('base64,')[1] : clothImage },
                    category: vtoCategory 
                }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false,
                enableImageRefinement: true // 👈 This is why it's "Smarter/Clearer"
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 50000 
        });

        const result = response.data.predictions?.[0]?.bytesBase64Encoded;

        if (result) {
            currentUsage++; 
            return res.status(200).json({ success: true, image: result });
        } else {
            throw new Error("AI returned empty result.");
        }

    } catch (error) {
        const errorDetail = error.response?.data?.[0]?.error?.message || error.message;
        console.error("VTO_ENTERPRISE_FAIL:", errorDetail);
        return res.status(200).json({ 
            success: false, 
            error: "System busy. Please ensure your photo shows your full body clearly." 
        });
    }
}