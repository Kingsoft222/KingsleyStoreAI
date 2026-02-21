import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. STATE ---
let userPhoto = "";
let selectedCloth = null;
const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

// --- 3. UI UNLOCKER ---
function unlockUI() {
    const ids = ['ai-input', 'user-fit-input'];
    ids.forEach(id => { 
        const el = document.getElementById(id);
        if(el) el.disabled = false; 
    });
    document.querySelectorAll('.send-circle, .mic-circle').forEach(el => {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
    });
}
window.onload = unlockUI;

// --- 4. IMAGE PROCESSING ---
async function getBase64FromUrl(url) {
    const data = await fetch(url);
    const blob = await data.blob();
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

// --- 5. CORE SEARCH & VTO LOGIC ---
export function executeSearch() {
    const inputEl = document.getElementById('ai-input');
    const results = document.getElementById('ai-results');
    if (!inputEl || !results) return;
    
    const input = inputEl.value.toLowerCase();
    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input));
    
    results.style.display = 'grid';
    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="background:#111; border-radius:12px; padding-bottom:10px; cursor:pointer; border:1px solid #222;">
            <img src="images/${item.img}" style="width:100%; height:160px; object-fit:cover; border-radius:12px 12px 0 0;">
            <h4 style="color:white; margin:8px; font-size:0.9rem;">${item.name}</h4>
            <p style="color:#e60023; font-weight:900; margin-left:8px;">${item.price}</p>
        </div>`).join('');
}

export function promptShowroomChoice(id) {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
}

export function handleUserFitUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => { 
        userPhoto = ev.target.result; 
        window.startVertexModeling(); 
    };
    reader.readAsDataURL(file);
}

export async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 45;
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #000; color: white; align-items: center; justify-content: center; text-align: center; padding: 20px;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center; border: 4px solid #222; border-radius: 50%;">
                <div id="spinner-ring" style="position:absolute; inset:-4px; border:4px solid transparent; border-top-color:#e60023; border-radius:50%; animation: spin 1s linear infinite;"></div>
                <div id="countdown-number" style="font-size: 2.5rem; font-weight: 900;">${timeLeft}</div>
            </div>
            <h3 style="margin-top:30px; letter-spacing:2px; font-weight:800; color:#e60023;">PREPARING YOUR FIT</h3>
            <p style="color:#666; font-size: 0.9rem;">Kingsley AI is stitching the ${selectedCloth.name} onto your photo...</p>
        </div>
        <style> @keyframes spin { to { transform: rotate(360deg); } } </style>`;

    const timer = setInterval(() => { 
        if(timeLeft > 0) timeLeft--; 
        const countEl = document.getElementById('countdown-number');
        if(countEl) countEl.innerText = timeLeft; 
    }, 1000);

    try {
        const userB64 = await compressImage(userPhoto);
        const clothB64 = await getBase64FromUrl(`images/${selectedCloth.img}`);
        const jobId = "job_" + Date.now();

        await setDoc(doc(db, "vto_jobs", jobId), { status: "pending", createdAt: serverTimestamp() });

        const unsub = onSnapshot(doc(db, "vto_jobs", jobId), (snap) => {
            const data = snap.data();
            if (data?.status === "completed") {
                clearInterval(timer); 
                unsub();
                window.displayFinalAnkara(data.resultImageUrl);
            } else if (data?.status === "failed") {
                clearInterval(timer); 
                unsub();
                alert("AI Tailor Error: " + (data.error || "Please try a clearer photo."));
                location.reload();
            }
        });

        const res = await fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            body: JSON.stringify({ jobId, userImage: userB64, clothImage: clothB64 })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Internal Server Error");
        }

    } catch (e) {
        console.error(e);
        clearInterval(timer);
        alert("System Error: " + e.message);
        location.reload();
    }
}

export function displayFinalAnkara(url) {
    document.getElementById('video-main-container').innerHTML = `
        <div style="display:flex; flex-direction:column; height:100dvh; width:100%; background:#000; overflow:hidden; position:fixed; inset:0; z-index:9999;">
            <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:20px;">
                <img src="${url}?t=${Date.now()}" style="max-width:100%; max-height:80vh; border-radius:16px; border:2px solid #333; box-shadow:0 0 50px rgba(230,0,35,0.4);">
            </div>
            <div style="padding:20px 20px 40px; background:linear-gradient(to top, #000 80%, transparent); display:flex; justify-content:center;">
                <button onclick="location.reload()" style="background:#e60023; color:white; padding:20px; border-radius:50px; font-weight:800; width:100%; max-width:400px; border:none; cursor:pointer; font-size:1.1rem; letter-spacing:1px;">
                    ADD TO CART 🛍️
                </button>
            </div>
        </div>`;
}

// --- 6. GLOBAL EXPOSURE ---
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;
window.startVertexModeling = startVertexModeling;
window.displayFinalAnkara = displayFinalAnkara;