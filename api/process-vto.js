import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        // --- ULTIMATE JSON SAFETY CHECK ---
        let data;
        if (typeof req.body === 'string') {
            try {
                data = JSON.parse(req.body);
            } catch (e) {
                // If it fails to parse, it might already be an object masquerading as a string
                data = req.body; 
            }
        } else {
            data = req.body;
        }

        const { userImage, clothImage, category } = data;

        // Check if data actually exists before moving on
        if (!userImage || !clothImage) {
            return res.status(400).json({ success: false, error: "Missing image data from frontend." });
        }

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        let vtoCategory = "DRESS";
        if (category === "Corporate") vtoCategory = "TOP";
        if (category === "Casual") vtoCategory = "BOTTOM";
        if (category === "Native") vtoCategory = "DRESS";

        const response = await axios.post(url, {
            instances: [{
                personImage: { image: { bytesBase64Encoded: userImage } },
                productImages: [{ 
                    image: { bytesBase64Encoded: clothImage },
                    category: vtoCategory 
                }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false,
                enableImageRefinement: true,
                guidanceScale: (category === "Bridal" || category === "Native") ? 5.0 : 2.5 
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 58000 
        });

        const prediction = response.data.predictions[0];
        if (!prediction?.bytesBase64Encoded) throw new Error("AI returned no data.");

        return res.status(200).json({ success: true, image: prediction.bytesBase64Encoded });

    } catch (error) {
        // This will now show up even if the error is weird
        console.error("VTO ERROR:", error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            error: "AI error. Please ensure the photo shows your full body." 
        });
    }
}