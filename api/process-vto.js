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
                data = req.body; 
            }
        } else {
            data = req.body;
        }

        const { userImage, clothImage, category } = data;

        if (!userImage || !clothImage) {
            return res.status(400).json({ success: false, error: "Missing image data from frontend." });
        }

        // Clean Base64 strings (Remove data:image/png;base64, etc if present)
        const cleanUserImage = userImage.replace(/^data:image\/\w+;base64,/, "");
        const cleanClothImage = clothImage.replace(/^data:image\/\w+;base64,/, "");

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        // Vertex AI v1 Prediction URL
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // Maintain your logic for categories
        let vtoCategory = "DRESS";
        if (category === "Corporate") vtoCategory = "TOP";
        if (category === "Casual") vtoCategory = "BOTTOM";
        if (category === "Native") vtoCategory = "DRESS";

        // Updated Request Body for Vertex AI 2026 Standards
        const requestBody = {
            instances: [{
                image: {
                    bytesBase64Encoded: cleanUserImage
                },
                clothes: [{
                    image: {
                        bytesBase64Encoded: cleanClothImage
                    },
                    category: vtoCategory
                }]
            }],
            parameters: {
                sampleCount: 1,
                addWatermark: false,
                enableImageRefinement: true,
                guidanceScale: (category === "Bridal" || category === "Native") ? 5.0 : 2.5
            }
        };

        const response = await axios.post(url, requestBody, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 58000 
        });

        // Vertex AI response structure check
        const prediction = response.data.predictions[0];
        
        // The model returns the image inside an 'image' object or 'bytesBase64Encoded'
        const resultImage = prediction?.image?.bytesBase64Encoded || prediction?.bytesBase64Encoded;

        if (!resultImage) {
            console.error("Vertex AI returned structure:", JSON.stringify(response.data));
            throw new Error("AI returned no data.");
        }

        return res.status(200).json({ success: true, image: resultImage });

    } catch (error) {
        console.error("VTO ERROR:", error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            error: "AI error. Please ensure the photo shows your full body clearly." 
        });
    }
}