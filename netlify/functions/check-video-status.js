/**
 * Kingsley Store AI - check-video-status.js
 * Purpose: Tells the app when the AI video is ready.
 */

const axios = require('axios');

exports.handler = async (event) => {
    // We check which cloth the app is asking about
    const clothName = event.queryStringParameters.cloth;

    try {
        // This logic checks your storage (like a simple database or temporary cache)
        // For now, we point it to the AI's output destination.
        // REPLACE 'YOUR_STORAGE_URL' with your actual video bucket/storage link.
        const videoUrl = `https://your-storage.com/videos/${clothName.replace(/\s+/g, '_')}.mp4`;

        // Check if the file actually exists yet
        const response = await axios.head(videoUrl);
        
        if (response.status === 200) {
            return {
                statusCode: 200,
                body: JSON.stringify({ videoUrl: videoUrl })
            };
        } else {
            return { statusCode: 202, body: JSON.stringify({ message: "Still sewing..." }) };
        }
    } catch (error) {
        // If file not found, we just tell the app to keep waiting
        return {
            statusCode: 202,
            body: JSON.stringify({ message: "Processing..." })
        };
    }
};