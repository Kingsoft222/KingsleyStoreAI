import axios from "axios";
import { GoogleAuth } from 'google-auth-library';

export default async (request, context) => {
    console.log("!!! [VTO-ENGINE] TRIGGERED !!!");

    try {
        const body = await request.json();
        const { userImage, clothImage } = body;

        const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!rawEnv) throw new Error("Netlify Environment Variable is missing.");

        const serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        // 1. Get Google Token
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 2. Call Vertex AI
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        console.log("!!! [VTO-ENGINE] CALLING GOOGLE AI...");

        const response = await axios.post(url, {
            instances: [{
                personImage: { image: { bytesBase64Encoded: userImage } },
                productImages: [{ image: { bytesBase64Encoded: clothImage } }]
            }],
            parameters: { sampleCount: 1, addWatermark: false }
        }, {
            headers: { 
                Authorization: `Bearer ${token.token}`, 
                'Content-Type': 'application/json' 
            }
        });

        const prediction = response.data.predictions[0];
        if (!prediction?.bytesBase64Encoded) throw new Error("AI returned no image.");

        console.log("!!! [VTO-ENGINE] SUCCESS !!!");

        // 3. Send Base64 directly back to the phone
        return new Response(JSON.stringify({ 
            success: true, 
            image: prediction.bytesBase64Encoded 
        }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error("!!! [VTO-ENGINE] CRASH:", msg);
        return new Response(JSON.stringify({ success: false, error: msg }), { status: 500 });
    }
};