import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// --- 🛡️ BUDGET GUARD: Limits to 70 successful try-ons (approx. ₦4,000) ---
let globalUsageCounter = 0;
const MAX_LIMIT = 70;

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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 1. Check if the 70-limit has been reached
    if (globalUsageCounter >= MAX_LIMIT) {
        return res.status(403).json({ 
            success: false, 
            error: "Premium Daily Limit (70/70) reached. We reset at midnight!" 
        });
    }

    try {
        const { userImage, clothImageUrl, category } = req.body;

        if (!userImage || !clothImageUrl) {
            return res.status(400).json({ error: "Missing images for processing." });
        }

        // 2. Prepare Base64 Data
        const cleanUser = userImage.includes('base64,') ? userImage.split('base64,')[1] : userImage;
        const cleanCloth = await downloadImageAsBase64(clothImageUrl);

        // 3. Authenticate with Google Cloud
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const accessToken = tokenResponse.token;

        // 4. Define the Specialized VTO Endpoint
        const projectId = serviceAccount.project_id;
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // 5. Map Category (TOP, BOTTOM, or DRESS)
        let vtoCategory = "DRESS";
        const cat = String(category || "").toUpperCase();
        if (cat.includes("TOP") || cat.includes("SHIRT")) vtoCategory = "TOP";
        if (cat.includes("BOTTOM") || cat.includes("PANTS")) vtoCategory = "BOTTOM";

        // 6. Construct the Payload 
        // Added 'prompt' to ensure the AI respects the product length and style over the user's current outfit.
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
                addWatermark: false,
                prompt: "Show the full length and original fit of the product garment. Ignore the length and shape of the existing clothing on the person. Maintain the exact style and flow of the new cloth."
            }
        };

        // 7. Execute API Call
        const response = await axios.post(url, payload, {
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 28000 
        });

        // 8. Extract Result
        const predictions = response.data.predictions;
        const resultBase64 = predictions?.[0]?.bytesBase64Encoded || predictions?.[0]?.image?.bytesBase64Encoded;

        if (resultBase64) {
            // Increment only on successful generation
            globalUsageCounter++; 
            console.log(`LOG: VTO Success. Current Usage: ${globalUsageCounter}/${MAX_LIMIT}`);
            
            return res.status(200).json({ 
                success: true, 
                image: resultBase64 
            });
        } else {
            throw new Error("AI engine failed to generate an image.");
        }

    } catch (error) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error(`LOG: VTO Error ->`, errorMessage);
        
        return res.status(statusCode).json({ 
            success: false, 
            error: "Process failed. Please ensure the photo is clear." 
        });
    }
}