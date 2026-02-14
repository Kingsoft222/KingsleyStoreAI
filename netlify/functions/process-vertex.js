const response = await axios.post(apiURL, {
    instances: [{
        // MANDATORY 2026 PROMPT SYNTAX: 
        // You must link the prompt text to the specific referenceId [1]
        prompt: `Generate an image about the person [1] to match this description: a professional fashion photo of the person [1] wearing a luxury ${cloth}. High quality textures, realistic fabric.`,
        referenceImages: [{
            referenceId: 1,
            referenceType: "REFERENCE_TYPE_RAW",
            image: { 
                bytesBase64Encoded: cleanBase64,
                mimeType: "image/png"
            }
        }]
    }],
    parameters: {
        sampleCount: 1,
        // MANDATORY 2026 SAFETY FLAG
        person_generation: "allow_all", 
        editConfig: {
            editMode: "EDIT_MODE_INPAINT_INSERTION",
            maskConfig: { 
                maskMode: "MASK_MODE_FOREGROUND" 
            }
        }
    }
}, {
    headers: { 'Authorization': `Bearer ${token}` }
});