import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. APP STATE ---
let userPhoto = "";
let selectedCloth = null;
const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

// --- 3. UI UTILITIES ---
function unlockUI() {
    // FIX: Target the send-circle button specifically
    const sendBtn = document.querySelector('.send-circle');
    const allButtons = document.querySelectorAll('button');
    
    allButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
    
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
    }
}

window.onload = unlockUI;

export function executeSearch() {
    unlockUI();
    const inputField = document.getElementById('ai-input');
    const input = inputField.value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input || !results) return;

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
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" 
                style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer;">
            📸 UPLOAD REFERENCE PHOTO
        </button>`;
}

export function handleUserFitUpload(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startVertexModeling();
    };
    reader.readAsDataURL(e.target.files[0]);
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

// --- 4. THE CORE AI ENGINE ---
export async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 45;
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#000; color:white; font-family:sans-serif;">
            <div style="position:relative; width:140px; height:140px; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:100%; height:100%; border:6px solid #222; border-top:6px solid #e60023; border-radius:50%; animation: spin 1.2s linear infinite;"></div>
                <div id="countdown-number" style="font-size: 3rem; font-weight: 900; color: white;">${timeLeft}</div>
            </div>
            <h3 style="margin-top:40px; letter-spacing:2px; font-weight:800; color:#fff;">STITCHING YOUR LOOK...</h3>
            <p id="status-label" style="color:#888; margin-top:10px; font-size:0.9rem;">Processing on Secure Cloud</p>
        </div>
        <style> @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } </style>`;

    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerDisplay = document.getElementById('countdown-number');
        if (timerDisplay) timerDisplay.innerText = timeLeft;
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);

    try {
        const compressed = await compressImage(userPhoto);
        const jobId = "job_" + Date.now();

        await setDoc(doc(db, "vto_jobs", jobId), { 
            status: "pending", 
            createdAt: serverTimestamp() 
        });

        const unsub = onSnapshot(doc(db, "vto_jobs", jobId), (snap) => {
            const data = snap.data();
            if (data?.status === "completed" && data.resultImageUrl) {
                clearInterval(timerInterval);
                unsub();
                window.displayFinalAnkara(data.resultImageUrl);
            } else if (data?.status === "failed") {
                clearInterval(timerInterval);
                unsub();
                // FIX: Show the REAL error instead of "Busy"
                alert("AI Engine Error: " + (data.error || "Unknown Failure"));
                unlockUI();
                document.getElementById('video-experience-modal').style.display = 'none';
            }
        });

        fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: compressed, clothName: selectedCloth.name, jobId: jobId })
        });

    } catch (e) { 
        console.error("Critical Error:", e); 
        clearInterval(timerInterval);
        unlockUI();
    }
}

export function displayFinalAnkara(url) {
    document.getElementById('video-main-container').innerHTML = `
        <div style="width:100%; height:100vh; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; animation: fadeIn 0.8s ease-in;">
            <img src="${url}" style="max-height:80%; max-width:92%; border-radius:16px; border:2px solid #333; box-shadow: 0 0 30px rgba(230,0,35,0.3);">
            <div style="margin-top:30px; display:flex; gap:15px;">
                <button onclick="location.reload()" style="background:#e60023; color:white; padding:18px 45px; border-radius:50px; font-weight:800; border:none; cursor:pointer; font-size:1rem;">ADD TO CART 🛍️</button>
            </div>
        </div>
        <style> @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } </style>`;
}

// --- 5. EXPOSE TO WINDOW ---
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;
window.startVertexModeling = startVertexModeling;
window.displayFinalAnkara = displayFinalAnkara;