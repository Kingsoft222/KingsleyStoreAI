import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { userImage, clothImage, category } = req.body;

        // Strip headers and ensure clean raw base64
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

        // Strictly defined categories for the v1 model
        let vtoCategory = "DRESS"; 
        const catInput = String(category).toUpperCase();
        if (catInput.includes("TOP") || catInput.includes("CORPORATE")) vtoCategory = "TOP";
        if (catInput.includes("BOTTOM") || catInput.includes("CASUAL")) vtoCategory = "BOTTOM";

        // --- THE STRUCTURE FIX ---
        // Some versions of the API expect 'clothes' to be an object with 'image' inside it
        // and others expect it to be a direct 'bytesBase64Encoded' at the top level of the cloth item.
        const requestPayload = {
            instances: [{
                image: {
                    bytesBase64Encoded: cleanUser.trim()
                },
                clothes: [{
                    // Note: No nested 'image' object here, just bytesBase64Encoded directly
                    bytesBase64Encoded: cleanCloth.trim(),
                    category: vtoCategory
                }]
            }],
            parameters: {
                sampleCount: 1,
                addWatermark: false
            }
        };

        const response = await axios.post(url, requestPayload, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 59000 
        });

        // Response handling
        const prediction = response.data.predictions?.[0];
        const resultImage = prediction?.bytesBase64Encoded || prediction?.image?.bytesBase64Encoded;

        if (resultImage) {
            return res.status(200).json({ success: true, image: resultImage });
        } else {
            throw new Error("AI returned success but no image data.");
        }

    } catch (error) {
        const detail = error.response?.data?.[0]?.error?.message || error.response?.data?.error?.message || error.message;
        console.error("STILL_FAILING_LOG:", detail);
        
        return res.status(500).json({ 
            success: false, 
            error: `Stitching Error: ${detail}` 
        });
    }
}