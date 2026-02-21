import axios from "axios";
import { GoogleAuth } from 'google-auth-library';

// LOG TO PROVE THE ENGINE IS TURNING OVER
console.log("!!! [VTO-BACKEND] INITIALIZING ENGINE !!!");

export default async (request, context) => {
    console.log("!!! [VTO-BACKEND] REQUEST RECEIVED !!!");

    try {
        // 1. Parse Request
        const body = await request.json();
        const { userImage, clothImage } = body;

        const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!rawEnv) throw new Error("Server Environment Variable 'FIREBASE_SERVICE_ACCOUNT' is missing.");

        const serviceAccount = JSON.parse(rawEnv);
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

        // 2. Authenticate with Google
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        // 3. Call Vertex AI Virtual Try-On
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        console.log("!!! [VTO-BACKEND] CALLING VERTEX AI...");

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
        if (!prediction || !prediction.bytesBase64Encoded) {
            throw new Error("Google AI returned an empty result.");
        }

        console.log("!!! [VTO-BACKEND] SUCCESS: SENDING IMAGE BACK TO FRONTEND !!!");

        // 4. Send the result back as JSON
        return new Response(JSON.stringify({ 
            success: true, 
            image: prediction.bytesBase64Encoded 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error("!!! [VTO-BACKEND] CRASH DETAIL:", msg);
        
        return new Response(JSON.stringify({ 
            success: false, 
            error: msg 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};