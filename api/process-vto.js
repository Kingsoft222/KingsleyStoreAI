import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImage, category } = req.body;

        // CRITICAL FIX: Ensure no headers or metadata are sent to the AI model
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

        // Exact mapping for the dedicated VTO model
        let vtoCategory = "DRESS";
        if (category === "Corporate" || category === "Suits") vtoCategory = "TOP";
        if (category === "Casual") vtoCategory = "BOTTOM";

        const response = await axios.post(url, {
            instances: [{
                image: { bytesBase64Encoded: cleanUser.trim() },
                clothes: [{ 
                    image: { bytesBase64Encoded: cleanCloth.trim() }, 
                    category: vtoCategory 
                }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false,
                enableImageRefinement: true
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 55000 
        });

        const resultImage = response.data.predictions[0]?.image?.bytesBase64Encoded;

        if (!resultImage) {
            console.error("Vertex AI Response:", JSON.stringify(response.data));
            throw new Error("AI prediction failed - no image returned");
        }

        return res.status(200).json({ success: true, image: resultImage });

    } catch (error) {
        console.error("VTO BACKEND ERROR:", error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            error: "The AI Tailor encountered an error. Please try a different photo." 
        });
    }
}