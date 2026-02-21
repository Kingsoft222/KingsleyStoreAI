export default async (request, context) => {
    console.log("!!! [ENGINE] BOOT SUCCESSFUL !!!");

    try {
        const { userImage, clothImage } = await request.json();
        const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        
        if (!rawEnv) throw new Error("Environment Variable Missing");
        const serviceAccount = JSON.parse(rawEnv);

        // 1. Get Token using native fetch to avoid library crashes
        // We'll use a simplified flow here to prove the connection first
        console.log("!!! [ENGINE] DATA RECEIVED for Project:", serviceAccount.project_id);

        // For this final test, we return your photo back to prove the "Pipe" is open
        return new Response(JSON.stringify({ 
            success: true, 
            image: userImage, // Sending back your photo to prove the loop works
            message: "THE PIPE IS OPEN!" 
        }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("!!! [ENGINE] CRASH:", error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};