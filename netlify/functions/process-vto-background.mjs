/** * Netlify Function: process-vto-background.mjs
 * This version uses the standard 'export default' for Netlify V2 functions.
 */

export default async (request, context) => {
    // This MUST show up in Netlify logs now
    console.log("--- [PULSE-TEST] FUNCTION INVOKED ---");

    try {
        // Modern request parsing for .mjs files
        const body = await request.json();
        const { jobId, userImage } = body;

        console.log("--- [PULSE-TEST] JOB ID:", jobId);

        // Prove we can read your Netlify environment variables
        const hasEnv = !!process.env.FIREBASE_SERVICE_ACCOUNT;
        console.log("--- [PULSE-TEST] ENV DETECTED:", hasEnv);

        // RETURN SUCCESS: We send your image back to prove the loop works
        return new Response(JSON.stringify({ 
            success: true, 
            message: "SERVER IS TALKING!", 
            image: userImage 
        }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("--- [PULSE-TEST] CRASH:", error.message);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};