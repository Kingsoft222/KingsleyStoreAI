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
let userPhotoBase64 = "";
let selectedCloth = null;
const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

// --- 3. UI LOGIC ---
export function executeSearch() {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!results) return;
    
    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input));
    results.style.display = 'grid';
    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="background:#111; border-radius:12px; padding:10px; cursor:pointer; border:1px solid #222;">
            <img src="images/${item.img}" style="width:100%; height:160px; object-fit:cover; border-radius:10px;">
            <h4 style="color:white; margin:8px 0;">${item.name}</h4>
            <p style="color:#e60023; font-weight:900;">${item.price}</p>
        </div>`).join('');
}

export function promptShowroomChoice(id) {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
}

// --- 4. VTO PROCESSING ---
export function handleUserFitUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        userPhotoBase64 = event.target.result.split(',')[1];
        startVertexModeling();
    };
    reader.readAsDataURL(file);
}

export async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 45;
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100dvh; width: 100%; background: #000; color: white; align-items: center; justify-content: center; text-align: center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center; border: 4px solid #222; border-radius: 50%;">
                <div style="position:absolute; inset:-4px; border:4px solid transparent; border-top-color:#e60023; border-radius:50%; animation: spin 1s linear infinite;"></div>
                <div id="countdown-number" style="font-size: 2.5rem; font-weight: 900;">${timeLeft}</div>
            </div>
            <h3 style="margin-top:30px; font-weight:800; color:#e60023;">STITCHING YOUR LOOK...</h3>
        </div>
        <style> @keyframes spin { to { transform: rotate(360deg); } } </style>`;

    const timer = setInterval(() => { 
        if(timeLeft > 0) timeLeft--; 
        const countDisplay = document.getElementById('countdown-number');
        if(countDisplay) countDisplay.innerText = timeLeft; 
    }, 1000);

    const jobId = "job_" + Date.now();
    await setDoc(doc(db, "vto_jobs", jobId), { status: "pending", createdAt: serverTimestamp() });

    const unsub = onSnapshot(doc(db, "vto_jobs", jobId), (snap) => {
        const data = snap.data();
        if (data?.status === "completed") {
            clearInterval(timer);
            unsub();
            displayFinalAnkara(data.resultImageUrl);
        } else if (data?.status === "failed") {
            clearInterval(timer);
            unsub();
            alert("Error: " + data.error);
            location.reload();
        }
    });

    try {
        await fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            body: JSON.stringify({ jobId, userImage: userPhotoBase64, clothImage: selectedCloth.img })
        });
    } catch (e) { console.error(e); }
}

export function displayFinalAnkara(url) {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100dvh; width:100%; background:#000; position:fixed; inset:0; z-index:9999;">
            <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:20px;">
                <img src="${url}?t=${Date.now()}" style="max-width:100%; max-height:80vh; border-radius:16px; border:2px solid #333; box-shadow: 0 0 50px rgba(230,0,35,0.4);">
            </div>
            <div style="padding:20px 20px 60px; background:linear-gradient(to top, #000 80%, black); display:flex; justify-content:center; width:100%;">
                <button onclick="location.reload()" style="background:#e60023; color:white; padding:22px; border-radius:50px; font-weight:900; width:90%; max-width:400px; border:none; cursor:pointer; font-size:1.2rem; text-transform:uppercase;">
                    ADD TO CART 🛍️
                </button>
            </div>
        </div>`;
}

// --- 5. THE MISSING BRIDGE (DO NOT REMOVE) ---
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;
window.startVertexModeling = startVertexModeling;
window.displayFinalAnkara = displayFinalAnkara;