import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImage, category } = req.body;

        // Clean headers: Vertex AI only accepts the raw base64 string
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = clothImage.includes('base64,') ? clothImage.split('base64,')[1] : clothImage;

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // Map categories strictly to what the model expects
        let vtoCategory = "DRESS"; 
        if (category === "Corporate" || category === "Suits") vtoCategory = "TOP";
        if (category === "Casual") vtoCategory = "BOTTOM";

        const response = await axios.post(url, {
            instances: [{
                image: {
                    bytesBase64Encoded: cleanUser.trim()
                },
                clothes: [{
                    image: {
                        bytesBase64Encoded: cleanCloth.trim()
                    },
                    category: vtoCategory
                }]
            }],
            parameters: {
                sampleCount: 1,
                addWatermark: false
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 58000 
        });

        // Check if predictions exist in the response
        if (response.data.predictions && response.data.predictions.length > 0) {
            const prediction = response.data.predictions[0];
            const resultImage = prediction.image?.bytesBase64Encoded || prediction.bytesBase64Encoded;
            
            if (resultImage) {
                return res.status(200).json({ success: true, image: resultImage });
            }
        }

        console.error("Vertex AI Detailed Error:", JSON.stringify(response.data));
        throw new Error("AI returned an empty result.");

    } catch (error) {
        // Detailed logging for Vercel
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error("VTO FINAL ERROR:", errorMsg);
        
        return res.status(500).json({ 
            success: false, 
            error: `Stitching Error: ${errorMsg}` 
        });
    }
}