import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// --- 🛠️ Helper: Fetch Cloth from Firebase Storage ---
async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 15000 
        });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        console.error("LOG: Cloth Download Error ->", err.message);
        throw new Error("Could not fetch the clothing image from storage.");
    }
}

export default async function handler(req, res) {
    // Only allow POST requests from your app.js
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { userImage, clothImageUrl, category } = req.body;

        if (!userImage || !clothImageUrl) {
            return res.status(400).json({ error: "Missing images for processing." });
        }

        // 1. Prepare Base64 Data
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 2. Authenticate with Google Cloud
        // Ensure FIREBASE_SERVICE_ACCOUNT is set in your Vercel/Local Environment Variables
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const accessToken = tokenResponse.token;

        // 3. Define the Specialized VTO Endpoint
        const projectId = serviceAccount.project_id;
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // 4. Map Category (TOP, BOTTOM, or DRESS)
        let vtoCategory = "DRESS";
        const cat = String(category || "").toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        // 5. Construct the Payload (Exact Hierarchy for 4s Speed)
        const payload = {
            instances: [{
                personImage: {
                    image: { bytesBase64Encoded: cleanUser.trim() }
                },
                productImages: [{
                    image: { bytesBase64Encoded: cleanCloth.trim() },
                    category: vtoCategory
                }]
            }],
            parameters: { 
                sampleCount: 1, 
                addWatermark: false 
            }
        };

        console.log(`LOG: Sending VTO Task for ${vtoCategory} to Google AI...`);

        // 6. Execute API Call
        const response = await axios.post(url, payload, {
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 28000 // 28-second timeout to prevent infinite rolling
        });

        // 7. Extract Result
        const predictions = response.data.predictions;
        const resultBase64 = predictions?.[0]?.bytesBase64Encoded || predictions?.[0]?.image?.bytesBase64Encoded;

        if (resultBase64) {
            console.log("LOG: VTO Process Complete (Success)");
            return res.status(200).json({ 
                success: true, 
                image: resultBase64 
            });
        } else {
            console.error("LOG: AI returned empty prediction ->", JSON.stringify(response.data));
            throw new Error("AI engine failed to generate an image. Check photo clarity.");
        }

    } catch (error) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        console.error(`LOG: VTO Error [${statusCode}] ->`, errorMessage);
        
        return res.status(statusCode).json({ 
            success: false, 
            error: errorMessage 
        });
    }
}