const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    
    try {
        console.log("FUNCTION_START: Checking input data...");
        const body = JSON.parse(event.body);
        const image = body.image || body.face;
        const cloth = body.cloth;

        if (!image) throw new Error("STEP_1_FAIL: No image data received");
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) throw new Error("STEP_2_FAIL: Env Key missing");

        // Direct Auth approach to bypass library overhead
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        
        console.log("STEP_3: Attempting connection to Google...");
        
        // Using the 2026 stable try-on parameters
        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const payload = {
            instances: [{
                prompt: `A high-quality fashion photo. The person is now wearing a premium ${cloth} senator native outfit. Realistic fabric, perfect fit.`,
                image: { bytesBase64Encoded: image.split(';base64,').pop() }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                safetySetting: "block_none"
            }
        };

        // Note: For this direct method, you need to ensure your Netlify Env Var for the key is correct.
        // If this part fails, it's usually an AUTH issue.
        const response = await axios.post(apiURL, payload, {
            headers: { 
                'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`, // Ensure you have a valid token mechanism or use the previous Auth client
                'Content-Type': 'application/json' 
            }
        });

        console.log("STEP_4: Google responded!");

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${response.data.predictions[0].bytesBase64Encoded}`,
                status: "success"
            })
        };

    } catch (error) {
        console.error("FAIL_POINT:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Process Failed', step_failed: error.message })
        };
    }
};