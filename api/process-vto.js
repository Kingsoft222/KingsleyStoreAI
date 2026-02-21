import axios from 'axios';

export default async function handler(req, res) {
  // Vercel uses 'res.json' - much more stable than Netlify's 'Response'
  console.log("VTO API Triggered");

  try {
    const { userImage, clothImage } = JSON.parse(req.body);
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");

    // For the first deployment, we return a Success signal + your photo 
    // to prove the Vercel "Pipe" is working perfectly.
    return res.status(200).json({
      success: true,
      image: userImage,
      message: "Vercel is Live! No more stubborn errors."
    });

  } catch (error) {
    console.error("Vercel Crash:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}