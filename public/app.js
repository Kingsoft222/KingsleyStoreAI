/**
 * Kingsley Store AI - v95.0 "The Instant Stitch"
 * ARCHITECTURE: Firebase SDK + Direct AI Return + Instant Display
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAhzPRw3Gw4nN1DlIxDa1KszH69I4bcHPE",
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", tags: "luxury red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;

// --- IMAGE COMPRESSOR ---
function compressImage(base64, maxHeight = 800, quality = 0.8) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = maxHeight / img.height;
            canvas.height = maxHeight;
            canvas.width = img.width * scale;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
        };
        img.src = base64;
    });
}

// --- SEARCH GRID ---
export function executeSearch() {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input || !results) return;

    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    results.style.display = 'grid';
    results.style.gridTemplateColumns = 'repeat(2, 1fr)';
    results.style.gap = '12px';
    results.style.padding = '10px';

    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" 
             style="background:#111; border-radius:12px; overflow:hidden; border:1px solid #222; text-align:center; padding-bottom:10px;">
            <img src="images/${item.img}" style="width:100%; height:160px; object-fit:cover; display:block;">
            <h4 style="font-size:0.85rem; margin:8px 4px; color:white; font-weight:600;">${item.name}</h4>
            <p style="color:#e60023; font-weight:900; margin:0;">${item.price}</p>
        </div>`).join('');
}

export function promptShowroomChoice(id) {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" 
                style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer;">
            📸 SELECT YOUR STANDING PHOTO
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

// --- THE LIVE ENGINE ---
export async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');

    container.innerHTML = `
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; background:#000; color:white; text-align:center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin" style="color:#e60023; font-size: 4rem;"></i>
                <div id="countdown-timer" style="position:absolute; font-size:1.6rem; font-weight:900; color:white; top:50%; left:50%; transform:translate(-50%, -50%);">12</div>
            </div>
            <h3 id="loading-status-text" style="margin-top:25px; font-weight:800; letter-spacing:1px; text-transform:uppercase;">DRESSING YOU...</h3>
        </div>`;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
    }, 1000);

    try {
        const compressedUserImage = await compressImage(userPhoto);
        const jobId = "job_" + Date.now();

        // 1. Log the attempt to Firebase
        await setDoc(doc(db, "vto_jobs", jobId), {
            userId: "guest_user",
            status: "processing",
            clothId: selectedCloth.id.toString(),
            createdAt: serverTimestamp()
        });

        // 2. TRIGGER AI & WAIT FOR RESULT
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                userImage: compressedUserImage, 
                clothName: selectedCloth.name,
                jobId: jobId 
            })
        });

        if (!response.ok) throw new Error("Tailor Busy");

        // 3. GET THE GENERATED IMAGE (STITCHED VERSION)
        const blob = await response.blob();
        const finalStitchedUrl = URL.createObjectURL(blob);

        // 4. DISPLAY THE RESULT
        clearInterval(timerInterval);
        window.displayFinalAnkara(finalStitchedUrl);

        // 5. Update Database Record
        await setDoc(doc(db, "vto_jobs", jobId), { status: "completed" }, { merge: true });

    } catch (e) {
        clearInterval(timerInterval);
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>${e.message}</h3><button onclick="location.reload()" style="background:#e60023; color:white; border:none; padding:12px 25px; border-radius:50px; margin-top:20px;">RETRY</button></div>`;
    }
}

export function displayFinalAnkara(url) {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
            <div style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="${url}" style="width:auto; height:100%; max-width:100%; object-fit:contain; border-radius:10px;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 0 60px 0; background:linear-gradient(transparent, #000 70%); display:flex; justify-content:center; align-items:center;">
                <button style="background:#e60023; color:white; width:90vw; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="location.reload()">ADD TO CART 🛒</button>
            </div>
        </div>`;
}

// Global Bridge
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;
window.startVertexModeling = startVertexModeling;
window.displayFinalAnkara = displayFinalAnkara;