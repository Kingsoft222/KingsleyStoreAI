const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

// Using backticks ensures the new lines in the key are preserved correctly
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCf31M7s6EkLtKQ
vdw85l+/Jbp71Ux+8KGQHOHa7uhCDdNxapirMKI09WrjbnmgFKML1YBK2CCfdfEu
cyeVvIVmQGAvKBDEsO2kdkWmYWUwtA3YbDrt3/j9GL933P5hAjW7dx0J4G/S5vtW
WGqxv2ubr1Fvzq04zOnzcqrqp5xQiqDAeM/vPXfJ62oEDO0PwfR2ue2fbB5f2sro
QuSSXlHKBZgDnSObIq2XsjvPiRkNCJnzqukLF0itG5WuPpUOWP84Fa6dIBt0vtGH
SOBZOXt6A32S3edYkQ56tFJSCXoBcL+yNVSTv8DpnhTCx4SHBCDPWBP/6CeBkphY
ReUyTC6XAgMBAAECggEADUOstrfdJ1DhNJQkGUNt70CUm+CjI6cYaIoU7SLET3Kx
N+hFuXJkCuvPzgXk/nSn4Hv61HrhHgndlGKGhsRo9wZhVJhI5+DcHriXZ8oN6MAP
pAS60PCzymAKxsmlq2vRBHhKBv9Bl+iFMvFMDOpaZcTih1nJAnzx7jp11tlIPWBZ
hvmnkqH2CZBQjFtjWYCOF5ziBfJeO/U/DjknOrbG8L1of3bojYjk+ZSVCr8dctEz
S4Yxb/tswVdwE95KsA05Kw3e2s1Rkrf4WVuhI/ngl6d1/mjOWlBCkUrNF2txlyRQ
Bjb16rJVKtVbbmCaPNtnFU1U/z8v4qAH0zoquAQ/YQKBgQDQoJTkHpEdQcIk+5wX
rSRd+nQPFODaGWMB795wFtZKjhA6aw90F7Bazs1aLGBu/bIsluBvjZqWn2reFeG2
Rn/7OcSCgcWJKj5lPxAkaregm5oQgFYUtV9pIX1LSTTMfbqJXeEd4oxcoNrw4VVr
hZPZIS/b9oqigV/A//da+xY39wKBgQDELKP7zxgu9S7X6nofSH2LjgwGSP1ViddJ
gFnXMWciol2XLmo7sr3K+3q1jfcaWZmbESgekc8NNlXPANcoulb+GGXYS6Zyjpn8
Bt/8zbcBbRw1B3nf6JXQrwBxcxDwt8OHNlzq1pIlxu/Om11mgICMkqqGBYsKRVcY
cfFGq4xWYQKBgAniYcuBCz0InYslBJs2j8+ICzGfupt6sm8oDzDeVB7KJkiuQ9gr
OybCP4ZzLcp0aJmmOFHwso9KVETbYotBQdUEQqQwQ8yg3L3tQ/WFvNd2J9F6Uxm+
EhwoAwirGj5KAql5ci35Ss8kq9rXwjVK6dtSsDLKtnzGhmPdfLmpxb63AoGBAJ+u
vqSgBE1k4oZ6pIGGXjsUmxEapKvWEdoQkhCqdAsrIweGjo6dhgQOA+p47qUSPgiN
RJztjx5wFhTz2C+czmbysSQJICmrjggqCHUddlPA3u8DcN8j0Z8WdEPkp+tpic0s
ISI/GqOJdXY13Scsfnbug8OoC2+G1cheJ0mhJhDBAoGAFp6h09bI8yYNH0TsUvCm
eQKzsTwIuigBGyXU1JOVXu6vd2b6xgGQmB+TR+zU7DoLON6KRzx8RnxQjpmI5n3O
NZVpemuQRn/cuNS/rqqs4cZzkTxBGg9IJkH4zfzo5gUfEX/gpsxfe5gGPCAuPTWn
Ahi55BmAjO4tTNsABSXk3Is=
-----END PRIVATE KEY-----`;

const INTERNAL_KEY = {
  type: "service_account",
  project_id: "kingsleystoreai",
  private_key: privateKey,
  client_email: "firebase-adminsdk-fbsvc@kingsleystoreai.iam.gserviceaccount.com"
};

exports.handler = async (event) => {
    const headers = { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
    };

    try {
        const body = JSON.parse(event.body);
        const rawImage = body.face || body.image || body.userPhoto;
        const cloth = body.cloth || "senator native outfit";
        
        if (!rawImage) throw new Error("No image data found");

        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        const auth = new GoogleAuth({ 
            credentials: INTERNAL_KEY, 
            scopes: 'https://www.googleapis.com/auth/cloud-platform' 
        });
        
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A high-quality fashion photo. The person in the image is wearing a luxury ${cloth}. Realistic fabric, studio lighting.`,
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${output}`,
                status: "success" 
            })
        };

    } catch (error) {
        console.error("FINAL_ATTEMPT_ERROR:", error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "One last check...", details: error.message }) 
        };
    }
};