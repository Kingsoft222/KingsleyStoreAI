import { onRequest } from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import admin from "firebase-admin";
import { VertexAI } from '@google-cloud/vertexai';
import axios from 'axios';

if (!admin.apps.length) { admin.initializeApp(); }

// Initialize Vertex AI with your project details
// Updated model to gemini-3-pro-image-preview to resolve 404 errors found in logs
const vertexAI = new VertexAI({ project: 'kingsleystoreai', location: 'us-central1' });
const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-3-pro-image-preview',
});

/**
 * Helper to convert URLs to Base64
 * This bypasses browser CORS restrictions by fetching the image on the server.
 */
async function downloadImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data).toString('base64');
    } catch (e) {
        logger.error("Failed to download image from storage:", url);
        throw new Error("Image retrieval failed");
    }
}

/**
 * Main Virtual Try-On Cloud Function
 * Configured for high-performance (1GiB RAM) and long timeouts (300s).
 */
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
            return res.status(400).send({ 
                success: false, 
                error: "Required image URLs are missing" 
            });
        }

        logger.info("VTO Engine: Downloading images on server...");

        // Fetch both images simultaneously for speed
        const [userBase64, clothBase64] = await Promise.all([
            downloadImageAsBase64(userImageUrl),
            downloadImageAsBase64(clothImageUrl)
        ]);

        const prompt = `
            Task: Virtual Try-On. 
            Instruction: Take the clothing from the product image and overlay it naturally onto the person in the user image.
            Category: ${category || 'clothing'}.
            Preserve person details, skin tone, and background perfectly.
            Output: Return ONLY the final base64 image string.
        `;

        const request = {
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/jpeg', data: userBase64 } },
                    { inlineData: { mimeType: 'image/jpeg', data: clothBase64 } }
                ]
            }],
        };

        logger.info("VTO Engine: Sending request to Vertex AI Gemini...");
        const result = await generativeModel.generateContent(request);
        const response = await result.response;
        
        let finalBase64 = response.candidates[0].content.parts[0].text;
        
        // Clean the response: remove potential Markdown wrappers or data headers
        finalBase64 = finalBase64.replace(/data:image\/jpeg;base64,|\n|\s|```/g, "").trim();

        res.status(200).send({ 
            success: true, 
            image: finalBase64 
        });

    } catch (error) {
        logger.error("AI Stitching Engine Error:", error);
        res.status(500).send({ 
            success: false, 
            error: "The AI Tailor is busy. Please stay on the page while we retry." 
        });
    }
});