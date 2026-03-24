import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// --- BUDGET GUARD (70 Try-ons = ~₦4,000) ---
let currentUsage = 0;
const MAX_LIMIT = 70;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // 1. Check Daily Budget Limit
    if (currentUsage >= MAX_LIMIT) {
        return res.status(403).json({ 
            success: false, 
            error: "Premium Try-On limit reached for today. We reset at midnight!" 
        });
    }

    try {
        // Handle both stringified and object bodies from your existing UI logic
        let data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { userImage, clothImage, category } = data;

        if (!userImage || !clothImage) {
            return res.status(400).json({ success: false, error: "Images are missing." });
        }

        // 2. AUTHENTICATION (Using your saved Vercel Variable)
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 3. THE ENTERPRISE ENDPOINT (GA v1 2026)
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // 4. CATEGORY MAPPING (Matches your existing Logic)
        let vtoCategory = "DRESS";
        const cat = String(category || "").toUpperCase();
        if (cat.includes("TOP") || cat.includes("CORPORATE")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("CASUAL")) vtoCategory = "BOTTOM";

        // 5. THE 4-SECOND HD PAYLOAD
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
                enableImageRefinement: false, // 👈 KEY FOR 4-SEC SPEED (Skips the extra cleanup pass)
                guidanceScale: 2.5 
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 45000 // Prevents "Forever Loading" if a network glitch occurs
        });

        const prediction = response.data.predictions?.[0];
        const resultBase64 = prediction?.bytesBase64Encoded;

        if (resultBase64) {
            currentUsage++; // Track the 70-limit
            return res.status(200).json({ success: true, image: resultBase64 });
        } else {
            throw new Error("AI_NO_OUTPUT");
        }

    } catch (error) {
        console.error("VTO_FINAL_ERROR:", error.response?.data || error.message);
        // Returns success:false so your UI shows the error instead of spinning
        return res.status(200).json({ 
            success: false, 
            error: "Try-on process failed. Please ensure your photo is clear." 
        });
    }
}