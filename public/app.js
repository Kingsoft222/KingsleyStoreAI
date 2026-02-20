import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    // ... rest of your config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let userPhoto = "";
let selectedCloth = null;
const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

// --- HELPER: CONVERT IMAGE URL TO BASE64 ---
async function getBase64FromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

async function compressImage(base64) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = 800 / img.height;
            canvas.height = 800;
            canvas.width = img.width * scale;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
        };
        img.src = base64;
    });
}

export async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // ... (Loader/Timer UI remains the same)

    try {
        const compressedUser = await compressImage(userPhoto);
        // Get the pixels for the selected suit
        const clothPath = `images/${selectedCloth.img}`; 
        const clothBase64 = await getBase64FromUrl(clothPath);

        const jobId = "job_" + Date.now();
        await setDoc(doc(db, "vto_jobs", jobId), { status: "pending", createdAt: serverTimestamp() });

        const unsub = onSnapshot(doc(db, "vto_jobs", jobId), (snap) => {
            const data = snap.data();
            if (data?.status === "completed") {
                unsub();
                window.displayFinalAnkara(data.resultImageUrl);
            } else if (data?.status === "failed") {
                unsub();
                alert("AI Error: " + data.error);
            }
        });

        // SEND BOTH IMAGES
        fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userImage: compressedUser, 
                clothImage: clothBase64, 
                jobId: jobId 
            })
        });

    } catch (e) { console.error(e); }
}

export function displayFinalAnkara(url) {
    // Full Page Display Logic
    document.getElementById('video-main-container').innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #000;">
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <img src="${url}" style="max-width: 100%; max-height: 80vh; border-radius: 16px; box-shadow: 0 0 50px rgba(230,0,35,0.4);">
            </div>
            <div style="padding: 20px 20px 40px;">
                <button onclick="location.reload()" style="background:#e60023; color:white; padding:20px; border-radius:50px; width:100%; font-weight:800; border:none; cursor:pointer; font-size:1.2rem;">ADD TO CART 🛍️</button>
            </div>
        </div>`;
}

// Expose functions to window
window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => { userPhoto = ev.target.result; window.startVertexModeling(); };
    reader.readAsDataURL(e.target.files[0]);
};
window.startVertexModeling = startVertexModeling;
window.displayFinalAnkara = displayFinalAnkara;
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
};