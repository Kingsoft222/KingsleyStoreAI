import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        let data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { userImage, clothImage, category } = data;

        if (!userImage || !clothImage) {
            return res.status(400).json({ success: false, error: "Image data missing." });
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

        // Exact mapping for Nigerian Native Wear vs Corporate
        let vtoCategory = "DRESS";
        if (category === "Corporate" || category === "Top") vtoCategory = "TOP";
        if (category === "Casual" || category === "Bottom") vtoCategory = "BOTTOM";
        if (category === "Native" || category === "Agbada") vtoCategory = "DRESS";

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
                enableImageRefinement: true, // 👈 Keep this ON for the clear quality
                guidanceScale: 2.5 
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 55000 
        });

        const prediction = response.data.predictions?.[0];
        if (!prediction?.bytesBase64Encoded) throw new Error("AI returned no data.");

        return res.status(200).json({ success: true, image: prediction.bytesBase64Encoded });

    } catch (error) {
        console.error("VTO_SYSTEM_ERROR:", error.response?.data || error.message);
        return res.status(200).json({ 
            success: false, 
            error: "Please use a clear, full-body photo for the best fit." 
        });
    }
}