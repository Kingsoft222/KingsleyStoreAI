import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let userPhoto = "";
let selectedCloth = null;
const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

// FORCE ALL BUTTONS ENABLED
function unlockButtons() {
    document.querySelectorAll('button').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}

export function executeSearch() {
    unlockButtons(); // Never lock out
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input || !results) return;

    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input));
    results.style.display = 'grid';
    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="background:#111; border-radius:12px; padding-bottom:10px; cursor:pointer;">
            <img src="images/${item.img}" style="width:100%; height:160px; object-fit:cover;">
            <h4 style="color:white; margin:8px;">${item.name}</h4>
            <p style="color:#e60023; font-weight:900;">${item.price}</p>
        </div>`).join('');
}

export function promptShowroomChoice(id) {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer;">
            📸 UPLOAD PHOTO
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

export async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');

    container.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#000; color:white;">
        <i class="fas fa-circle-notch fa-spin" style="color:#e60023; font-size: 4rem;"></i>
        <h3 style="margin-top:20px;">STITCHING YOUR ANKARA...</h3>
    </div>`;

    try {
        const compressed = await compressImage(userPhoto);
        const jobId = "job_" + Date.now();

        await setDoc(doc(db, "vto_jobs", jobId), { status: "pending" });

        const unsub = onSnapshot(doc(db, "vto_jobs", jobId), (snap) => {
            const data = snap.data();
            if (data?.status === "completed" && data.resultImageUrl) {
                unsub();
                window.displayFinalAnkara(data.resultImageUrl);
            }
        });

        fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            body: JSON.stringify({ userImage: compressed, clothName: selectedCloth.name, jobId: jobId })
        });
    } catch (e) { console.error(e); }
}

export function displayFinalAnkara(url) {
    document.getElementById('video-main-container').innerHTML = `
        <div style="width:100%; height:100vh; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <img src="${url}" style="max-height:80%; max-width:90%; border-radius:12px;">
            <button onclick="location.reload()" style="margin-top:20px; background:#e60023; color:white; padding:15px 40px; border-radius:50px; font-weight:800;">FINISH 🛒</button>
        </div>`;
}

// Global scope
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;
window.startVertexModeling = startVertexModeling;
unlockButtons();