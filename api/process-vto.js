import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImage, category } = req.body;

        // Strip Base64 headers
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

        // Strict category mapping for Vertex VTO model
        let vtoCategory = "DRESS"; 
        const cat = String(category).toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT") || cat.includes("CORPORATE")) vtoCategory = "TOP";
        else if (cat.includes("BOTTOM") || cat.includes("PANTS") || cat.includes("CASUAL")) vtoCategory = "BOTTOM";

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
                addWatermark: false,
                enableImageRefinement: true
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 59000 
        });

        // The model returns the result inside predictions[0].image.bytesBase64Encoded
        const prediction = response.data.predictions?.[0];
        const resultImage = prediction?.image?.bytesBase64Encoded || prediction?.bytesBase64Encoded;

        if (resultImage) {
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            console.error("Vertex AI Response Structure:", JSON.stringify(response.data));
            throw new Error("The AI Tailor didn't return an image. Try a clearer body photo.");
        }

    } catch (error) {
        const detail = error.response?.data?.[0]?.error?.message || error.response?.data?.error?.message || error.message;
        console.error("VTO_LOG_ERROR:", detail);
        
        return res.status(500).json({ 
            success: false, 
            error: `Error: ${detail}` 
        });
    }
}