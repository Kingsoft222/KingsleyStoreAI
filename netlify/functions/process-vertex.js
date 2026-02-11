const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

const INTERNAL_KEY = {
  type: "service_account",
  project_id: "kingsleystoreai",
  private_key_id: "bc4191ad475bef72587d5bd886535ae4673581b4",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCf31M7s6EkLtKQ\nvdw85l+/Jbp71Ux+8KGQHOHa7uhCDdNxapirMKI09WrjbnmgFKML1YBK2CCfdfEu\ncyeVvIVmQGAvKBDEsO2kdkWmYWUwtA3YbDrt3/j9GL933P5hAjW7dx0J4G/S5vtW\nWGqxv2ubr1Fvzq04zOnzcqrqp5xQiqDAeM/vPXfJ62oEDO0PwfR2ue2fbB5f2sro\nQuSSXlHKBZgDnSObIq2XsjvPiRkNCJnzqukLF0itG5WuPpUOWP84Fa6dIBt0vtGH\nSOBZOXt6A32S3edYkQ56tFJSCXoBcL+yNVSTv8DpnhTCx4SHBCDPWBP/6CeBkphY\nReUyTC6XAgMBAAECggEADUOstrfdJ1DhNJQkGUNt70CUm+CjI6cYaIoU7SLET3Kx\nN+hFuXJkCuvPzgXk/nSn4Hv61HrhHgndlGKGhsRo9wZhVJhI5+DcHriXZ8oN6MAP\npAS60PCzymAKxsmlq2vRBHhKBv9Bl+iFMvFMDOpaZcTih1nJAnzx7jump11tlIPWBZ\nhvmnkqH2CZBQjFtjWYCOF5ziBfJeO/U/DjknOrbG8L1of3bojYjk+ZSVCr8dctEz\nS4Yxb/tswVdwE95KsA05Kw3e2s1Rkrf4WVuhI/ngl6d1/mjOWlBCkUrNF2txlyRQ\nBjb16rJVKtVbbmCaPNtnFU1U/z8v4qAH0zoquAQ/YQKBgQDQoJTkHpEdQcIk+5wX\nrSRd+nQPFODaGWMB795wFtZKjhA6aw90F7Bazs1aLGBu/bIsluBvjZqWn2reFeG2\nRn/7OcSCgcWJKj5lPxAkaregm5oQgFYUtV9pIX1LSTTMfbqJXeEd4oxcoNrw4VVr\nhZPZIS/b9oqigV/A//da+xY39wKBgQDELKP7zxgu9S7X6nofSH2LjgwGSP1ViddJ\ngFnXMWciol2XLmo7sr3K+3q1jfcaWZmbESgekc8NNlXPANcoulb+GGXYS6Zyjpn8\nBt/8zbcBbRw1B3nf6JXQrwBxcxDwt8OHNlzq1pIlxu/Om11mgICMkqqGBYsKRVcY\ncfFGq4xWYQKBgAniYcuBCz0InYslBJs2j8+ICzGfupt6sm8oDzDeVB7KJkiuQ9gr\nOybCP4ZzLcp0aJmmOFHwso9KVETbYotBQdUEQqQwQ8yg3L3tQ/WFvNd2J9F6Uxm+\nEhwoAwirGj5KAql5ci35Ss8kq9rXwjVK6dtSsDLKtnzGhmPdfLmpxb63AoGBAJ+u\nvqSgBE1k4oZ6pIGGXjsUmxEapKvWEdoQkhCqdAsrIweGjo6dhgQOA+p47qUSPgiN\nRJztjx5wFhTz2C+czmbysSQJICmrjggqCHUddlPA3u8DcN8j0Z8WdEPkp+tpic0s\nISI/GqOJdXY13Scsfnbug8OoC2+G1cheJ0mhJhDBAoGAFp6h09bI8yYNH0TsUvCm\neQKzsTwIuigBGyXU1JOVXu6vd2b6xgGQmB+TR+zU7DoLON6KRzx8RnxQjpmI5n3O\nNZVpemuQRn/cuNS/rqqs4cZzkTxBGg9IJkH4zfzo5gUfEX/gpsxfe5gGPCAuPTWn\nAhi55BmAjO4tTNsABSXk3Is=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@kingsleystoreai.iam.gserviceaccount.com"
};

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    try {
        if (!event.body) throw new Error("Empty request body");
        const body = JSON.parse(event.body);
        
        // Grab the image no matter what the field name is
        const rawImage = body.face || body.image || body.userPhoto || body.photo;
        const cloth = body.cloth || "senator native outfit";

        if (!rawImage) throw new Error("No image data found in request");

        // Clean base64 string
        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        const auth = new GoogleAuth({ credentials: INTERNAL_KEY, scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality fashion photo. Change the clothing of the person to a luxury ${cloth}. Realistic fabric, maintain face.`,
                image: { bytesBase64Encoded: cleanBase64 }
            }],
            parameters: {
                sampleCount: 1,
                editMode: "inpainting-insert",
                maskConfig: { maskMode: "MASK_MODE_FOREGROUND" },
                personGeneration: "allow_adult",
                safetySetting: "block_none"
            }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const output = response.data.predictions[0].bytesBase64Encoded;
        return { statusCode: 200, headers, body: JSON.stringify({ outputImage: `data:image/png;base64,${output}`, status: "success" }) };

    } catch (e) {
        console.error("FATAL_ERROR:", e.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Modeling failed", details: e.message }) 
        };
    }
};