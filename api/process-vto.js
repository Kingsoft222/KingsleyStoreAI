import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const data = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body;
        const { userImage, clothImage, category } = data;

        // Strip headers (Important: New Vertex API fails if "data:image..." is included)
        const cleanUser = userImage.replace(/^data:image\/\w+;base64,/, "");
        const cleanCloth = clothImage.replace(/^data:image\/\w+;base64,/, "");

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // Exact mapping required by the current model
        let vtoCategory = "DRESS";
        if (category === "Corporate") vtoCategory = "TOP";
        if (category === "Casual") vtoCategory = "BOTTOM";
        if (category === "Native") vtoCategory = "DRESS";

        const response = await axios.post(url, {
            instances: [{
                image: { bytesBase64Encoded: cleanUser },
                clothes: [{ 
                    image: { bytesBase64Encoded: cleanCloth }, 
                    category: vtoCategory 
                }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false,
                enableImageRefinement: true,
                guidanceScale: (category === "Native") ? 5.0 : 2.5 
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 58000 // Vercel max timeout safety
        });

        const prediction = response.data.predictions[0];
        const resultImage = prediction?.image?.bytesBase64Encoded || prediction?.bytesBase64Encoded;

        if (!resultImage) throw new Error("AI returned no data.");

        return res.status(200).json({ success: true, image: resultImage });

    } catch (error) {
        console.error("VTO ERROR DETAILS:", error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}