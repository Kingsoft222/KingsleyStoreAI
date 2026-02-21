import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    console.log("--- [AI-ENGINE] STARTING VIRTUAL TRY-ON ---");

    try {
        const { userImage, clothImage } = JSON.parse(req.body);

        // 2. Load and format Service Account from Vercel Environment Variables
        const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!rawEnv) throw new Error("FIREBASE_SERVICE_ACCOUNT is missing in Vercel settings.");
        
        const serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        // 3. Authenticate with Google Cloud
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 4. Construct the Google Vertex AI URL
        const projectId = serviceAccount.project_id;
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        console.log("--- [AI-ENGINE] CALLING GOOGLE VERTEX AI ---");

        // 5. The Actual AI Request
        const response = await axios.post(url, {
            instances: [{
                personImage: { image: { bytesBase64Encoded: userImage } },
                productImages: [{ image: { bytesBase64Encoded: clothImage } }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false 
            }
        }, {
            headers: { 
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 seconds limit
        });

        // 6. Extract the result
        const prediction = response.data.predictions[0];
        if (!prediction || !prediction.bytesBase64Encoded) {
            throw new Error("Google AI returned an empty result. Check image quality.");
        }

        console.log("--- [AI-ENGINE] SUCCESS: IMAGE GENERATED ---");

        // 7. Send the finished image back to your frontend
        return res.status(200).json({
            success: true,
            image: prediction.bytesBase64Encoded
        });

    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error("--- [AI-ENGINE] CRASH DETAIL:", errorMessage);
        
        return res.status(500).json({ 
            success: false, 
            error: errorMessage 
        });
    }
}