import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImage, category } = JSON.parse(req.body);
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // Map categories to the 3 types Google understands
        let vtoCategory = "DRESS";
        if (category === "Corporate") vtoCategory = "TOP";
        if (category === "Casual") vtoCategory = "BOTTOM";

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
                // Stable guidance prevents the "original image return" error
                guidanceScale: category === "Bridal" ? 5.0 : 2.5 
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
        return res.status(500).json({ success: false, error: "AI Processing Failed. Please try a clearer photo." });
    }
}