/**
 * Kingsley Store AI - High Speed Video Generator
 * Optimized for 5-10 second response times
 */

const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { swappedImage, clothName } = JSON.parse(event.body);

        if (!swappedImage) {
            return { statusCode: 400, body: JSON.stringify({ error: "Image data missing" }) };
        }

        // 1. THE PROMPT: Engineered for Native Wear & Immersive Boutique
        const prompt = `A cinematic fashion runway walk of a person wearing high-end ${clothName} traditional African native wear. The person is walking towards the camera in a luxury boutique showroom with soft golden lighting. High resolution, 4k, professional fashion film, fluid movement.`;

        // 2. THE AI CALL (Example using a high-speed endpoint)
        // Note: Replace API_URL and KEY with your specific provider (Vertex AI, Replicate, etc.)
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "cf64f33b-8f0c-449e-b14a-8d1979b0629a", // Using a fast model like Luma or Kling
                input: {
                    prompt: prompt,
                    image: `data:image/png;base64,${swappedImage}`,
                    duration: 3, // Short duration = faster generation
                    aspect_ratio: "9:16", // Full screen mobile look
                    frames_per_second: 24
                }
            })
        });

        const prediction = await response.json();

        // 3. THE "FAST" POLLING LOGIC
        // Instead of making the frontend wait, we poll here for up to 15 seconds
        let videoUrl = null;
        let attempts = 0;
        
        while (!videoUrl && attempts < 15) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 secs
            const check = await fetch(prediction.urls.get, {
                headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` }
            });
            const status = await check.json();
            
            if (status.status === "succeeded") {
                videoUrl = status.output; // This is usually the hosted MP4 URL
                break;
            } else if (status.status === "failed") {
                throw new Error("AI Generation Failed");
            }
            attempts++;
        }

        if (!videoUrl) {
            return { statusCode: 202, body: JSON.stringify({ status: "processing", id: prediction.id }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ videoUrl: videoUrl })
        };

    } catch (error) {
        console.error("Video Gen Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};