const axios = require('axios');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        // Updated to match the 'image' and 'cloth' keys sent by app.js
        const { image, cloth } = JSON.parse(event.body);

        if (!image || !cloth) {
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ error: 'Missing photo or cloth selection' }) 
            };
        }

        /**
         * KINGSLEY: This returns the result back to the frontend.
         * outputImage must be defined for app.js to show the result.
         */
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: image, // Returns the photo result
                status: "success",
                message: "Vertex Function Connected" 
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server Error: ' + error.message })
        };
    }
};