import { onRequest } from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import admin from "firebase-admin";
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';

if (!admin.apps.length) { admin.initializeApp(); }

const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

/**
 * Helper to convert URLs to Base64
 */
async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data).toString('base64');
    } catch (e) {
        logger.error("Failed to download image:", url);
        throw new Error("Image retrieval failed");
    }
}

export const process_vto = onRequest({ 
    cors: true, 
    timeoutSeconds: 300, 
    memory: "1GiB" 
}, async (req, res) => {
    
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { userImageUrl, clothImageUrl, category } = req.body;

        if (!userImageUrl || !clothImageUrl) {
            return res.status(400).send({ success: false, error: "Missing images" });
        }

        logger.info("VTO Engine: Preparing images...");

        const [userBase64, clothBase64] = await Promise.all([
            downloadImageAsBase64(userImageUrl),
            downloadImageAsBase64(clothImageUrl)
        ]);

        // Get Access Token for the REST API call
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        const projectId = process.env.GCLOUD_PROJECT || 'kingsleystoreai';
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/virtual-try-on-001:predict`;

        // Map categories for the dedicated VTO model
        let vtoCategory = "DRESS";
        if (category === "Corporate" || category === "Suits") vtoCategory = "TOP";
        if (category === "Casual") vtoCategory = "BOTTOM";
        if (category === "Native") vtoCategory = "DRESS";

        const requestBody = {
            instances: [{
                image: { bytesBase64Encoded: userBase64 },
                clothes: [{
                    image: { bytesBase64Encoded: clothBase64 },
                    category: vtoCategory
                }]
            }],
            parameters: {
                sampleCount: 1,
                addWatermark: false,
                enableImageRefinement: true,
                guidanceScale: (category === "Native" || vtoCategory === "DRESS") ? 5.0 : 2.5
            }
        };

        logger.info("VTO Engine: Calling Vertex AI Vision API...");
        
        const response = await axios.post(url, requestBody, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const prediction = response.data.predictions[0];
        const resultImage = prediction?.image?.bytesBase64Encoded || prediction?.bytesBase64Encoded;

        if (!resultImage) {
            throw new Error("AI returned no image data");
        }

        res.status(200).send({ 
            success: true, 
            image: resultImage 
        });

    } catch (error) {
        logger.error("VTO Error:", error.response?.data || error.message);
        res.status(500).send({ 
            success: false, 
            error: "The AI Tailor is busy. Please try again in a moment." 
        });
    }
});