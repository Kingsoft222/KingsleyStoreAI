const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

exports.handler = async (event) => {
    const headers = { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
    };

    try {
        const body = JSON.parse(event.body);
        const rawImage = body.image || body.face;
        const cloth = body.cloth || "luxury nigerian senator outfit";

        if (!rawImage) throw new Error("No photo data received.");

        // The exact key content
        const rawKey = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDJ8PAK93szIw+k\nsjAFLQMmgqegcdSHQUAVUlKi7fuqMEBVamz0I+5htEn5S1Roxp1Yu6Qo+0SzXVPu\n0Z5MFjSi1Ned/wogz6fC+WfMX0J9+0VTL+cJz7oXNaZbaKTE8+8wDIVynRpsskEk\nRnx1li5eJc8+AwB2fYBlSCcxdatVR/wLiL5W+SEOBWJZhrIHBoRPqF+Wb6IVYC6L\nTwk/0/WY7B7ctkghrKS5VBa0DQwz4+MgTVOTZy633fg0bkA1edo9a8QBHskyS+qQ\nO8b2GlNQ3t6vGgq1bDigDva/nUOpHeIW+ByzVYCe6tL6tI5dpYmMqBvqILhcXYj8\nYcsjAAEJAgMBAAECggEABXtEoMo/EZdWb/qllH1/d4+kP4e8zy2FhksVYQvRstVU\nk4CIjLJtNghKoRX+qIKKVIc4R7IOXmZ69++js8HNcEyFhSLI98Ml5stdGjV3+TJA\nDTYSRj9nvz0z9mx1lBQok63tG9i7Fg93hN6dKUEPTJgnz5UNnFRx5EbOD1OUabyL\n9yT0lerSzU8gthDtCDKEJF1S1hzS6fmpKXcIKxkTf+DmrNSkgznVD6q7KIelzoEo\n9qzCzu7z2BFRg93lJFiHOLqCQ76KkMyVPp9Luog7ff6KdYRwLBox8ZHSxFC3R/XA\nPcW0rdCQKO/CH6BUXdT0vP34YuPMUY14hEXllUn9ewKBgQDr9wuMm/YCIxizfCfo\npEmCGJmxcZQaR1Hkxybx6Gw+oTTyKos/J0Gx6Ayw/S8AwyjWV+3+0LQFl8y/hX2h\nzvAX1Kk8m8jtdsDU28HQOghQCm1F1Gp8WTv/okzIpaavDNiXCvsXwQ7NSbePEPl0\nT4p+5+YJQpErWzPHFWYegE47uwKBgQDbFljjk33Askio55uYvGJxdpaum95NBDOW\ngXn4Yg8WO00uMIsdVfS+pt9lDZ1HWujniPER43DYHpjK44SyQb7qMbLmbtpkBrBH\nL9yTmbj2tvsrZc8sCvTvVmPRS1t13ojaEdL7X6xr4j1OWMbY28/ruCfEhJjd3nTL\nUSZe/NtQCwKBgBBeKJzuTJhFWvdIS3RlwPuXPUIDwOQ5wkJ+VgM9vhRyFjweG16c\nGICAujCkv1fsMa78lnOwgmxI5Vj7p4VL13evtrWPkNZ4AFRDkiQhgmYa8w1++Iv7\nnJ/U4EKiyvclivifOF+jcqVm0abI5KTex5qZ92j5BxzczLComVbQS5z1AoGATOsG\noDerIdk2G17dSP1yzoUlF/6PSJjeB8xDZ0n+I/8D9OCEJvODrt/ldJQYEPJA7PEu\nOeqRNr9fQ3QnpXHhtlVmivKGaDHU99k85vFEeBH8Ett2pe7e2ZyKBPQhEzvi7jTt\zuVjIqlWfsg6X+6kjAymoZ8wEE1G0g8WmqjJ0ssCgYBd0+woobRWjdq9ZngXoQpt\nNrrZ6e5/AJcNRwJXzQGNO2A/FQBSM7y4F2RvPgRewUNxP/uVYRHsM/FGc+N3nNTL\n5qEC0SXbFZSHjkZ2Pq/A7mwcNWfX5jVvWeU5QEVdlcZU7Ff/LJJ4AkbZgfAba8kP\nIbp5SCbp1wQpFiPgS9p99w==\n-----END PRIVATE KEY-----\n`;

        const credentials = {
            project_id: "kingsleystoreai",
            client_email: "firebase-adminsdk-fbsvc@kingsleystoreai.iam.gserviceaccount.com",
            private_key: rawKey.split('\\n').join('\n')
        };

        const auth = new GoogleAuth({
            credentials,
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });

        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const apiURL = `https://us-central1-aiplatform.googleapis.com/v1/projects/kingsleystoreai/locations/us-central1/publishers/google/models/image-generation@006:predict`;
        const cleanBase64 = rawImage.includes('base64,') ? rawImage.split('base64,').pop() : rawImage;

        const response = await axios.post(apiURL, {
            instances: [{
                prompt: `A professional high-fashion photo. The person is wearing a luxury ${cloth}. Realistic fabric and lighting.`,
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                outputImage: `data:image/png;base64,${response.data.predictions[0].bytesBase64Encoded}` 
            })
        };

    } catch (error) {
        console.error("LOG:", error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: "Modeling failed", details: error.message }) 
        };
    }
};