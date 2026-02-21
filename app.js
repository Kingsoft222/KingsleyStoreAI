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

let userPhotoRaw = "";
let selectedCloth = null;

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

async function getBase64FromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cloth missing at ${url}`);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

export function executeSearch() {
    const results = document.getElementById('ai-results');
    if (!results) return;
    results.style.display = 'grid';
    results.innerHTML = clothesCatalog.map(item => `
        <div class="card" onclick="window.promptShowroomChoice(${item.id})" style="background:#111; padding:15px; border-radius:15px; cursor:pointer; border:1px solid #222; text-align:center;">
            <img src="/images/${item.img}" style="width:100%; border-radius:10px; height:200px; object-fit:cover;">
            <h3 style="color:white; margin:10px 0; font-size:1rem;">${item.name}</h3>
            <p style="color:#e60023; font-weight:800; margin:0;">${item.price}</p>
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
    reader.onload = (event) => {
        userPhotoRaw = event.target.result.split(',')[1];
        startVertexModeling();
    };
    reader.readAsDataURL(file);
}

export async function startVertexModeling() {
    if (!selectedCloth) return alert("Please select an item first.");

    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 45;
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100dvh; width: 100%; align-items: center; justify-content: center; text-align: center; background:#000;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center; border: 4px solid #222; border-radius: 50%;">
                <div class="spinner-ring"></div>
                <div id="countdown-number" style="font-size: 2.5rem; font-weight: 900; color:white;">${timeLeft}</div>
            </div>
            <h3 style="margin-top:30px; font-weight:800; color:#e60023; letter-spacing:1px;">STITCHING YOUR LOOK...</h3>
        </div>`;

    const timer = setInterval(() => { 
        if(timeLeft > 0) timeLeft--; 
        const el = document.getElementById('countdown-number');
        if(el) el.innerText = timeLeft; 
    }, 1000);

    try {
        const clothB64 = await getBase64FromUrl(`/images/${selectedCloth.img}`);
        const jobId = "job_" + Date.now();
        
        // Initialize Firebase Entry
        await setDoc(doc(db, "vto_jobs", jobId), { status: "pending", createdAt: serverTimestamp() });

        // Listen for AI completion
        onSnapshot(doc(db, "vto_jobs", jobId), (snap) => {
            const data = snap.data();
            if (data?.status === "completed") {
                clearInterval(timer);
                displayFinalAnkara(data.resultImageUrl);
            } else if (data?.status === "failed") {
                clearInterval(timer);
                alert("AI Error: " + data.error);
                location.reload();
            }
        });

        // HIT THE NEW .mjs BACKEND
        await fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                jobId, 
                userImage: userPhotoRaw, 
                clothImage: clothB64 
            })
        });

    } catch (e) { 
        alert("Client Error: " + e.message); 
        location.reload(); 
    }
}

export function displayFinalAnkara(url) {
    document.getElementById('video-main-container').innerHTML = `
        <div style="display:flex; flex-direction:column; height:100dvh; width:100%; background:#000; position:fixed; inset:0; z-index:9999;">
            <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:20px;">
                <img src="${url}?t=${Date.now()}" style="max-width:100%; max-height:80vh; border-radius:16px; border:2px solid #333;">
            </div>
            <div style="padding:20px 20px 60px; background:#000; display:flex; justify-content:center;">
                <button onclick="location.reload()" style="background:#e60023; color:white; padding:22px; border-radius:50px; font-weight:900; width:90%; border:none; cursor:pointer; text-transform:uppercase;">
                    ADD TO CART 🛍️
                </button>
            </div>
        </div>`;
}

// Global Bridge
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;