import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app"
};
initializeApp(firebaseConfig);

let userPhotoRaw = "";
let selectedCloth = null;

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

// Helper to convert images to Base64
async function getBase64FromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

export function executeSearch() {
    const results = document.getElementById('ai-results');
    results.style.display = 'grid';
    results.innerHTML = clothesCatalog.map(item => `
        <div class="card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="/images/${item.img}" style="width:100%; border-radius:10px;">
            <h3>${item.name}</h3>
            <p style="color:#e60023; font-weight:800;">${item.price}</p>
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
        startVtoProcess();
    };
    reader.readAsDataURL(file);
}

async function startVtoProcess() {
    if (!selectedCloth) return alert("Please select a cloth first!");

    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 30;
    container.innerHTML = `
        <div class="mall-loader-container">
            <div class="spinner-ring"></div>
            <h2 id="timer-text" style="color:#e60023; font-size: 2.5rem; margin: 10px 0;">${timeLeft}s</h2>
            <p style="color:white; font-weight:bold;">KINGSLEY AI IS STITCHING YOUR WEAR...</p>
        </div>`;

    const countdown = setInterval(() => {
        timeLeft--;
        const el = document.getElementById('timer-text');
        if (el) el.innerText = timeLeft + "s";
        if (timeLeft <= 0) clearInterval(countdown);
    }, 1000);

    try {
        const clothB64 = await getBase64FromUrl(`/images/${selectedCloth.img}`);
        
        // POINTING TO VERCEL API
        const response = await fetch('/api/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userPhotoRaw, 
                clothImage: clothB64 
            })
        });

        const result = await response.json();
        clearInterval(countdown);

        if (result.success) {
            // result.image will contain the Base64 data from the API
            displayFinalResult(`data:image/jpeg;base64,${result.image}`);
        } else {
            throw new Error(result.error || "AI failed to respond");
        }
    } catch (e) {
        clearInterval(countdown);
        console.error("VTO Error:", e);
        alert("ERROR: " + e.message);
        location.reload();
    }
}

function displayFinalResult(src) {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `
        <div class="result-wrapper">
            <img src="${src}" style="max-width:90%; border: 3px solid #e60023; border-radius:15px;">
        </div>
        <div class="vto-action-footer">
            <button id="vto-add-to-cart" onclick="location.reload()">ADD TO CART 🛍️</button>
        </div>`;
}

// Global scope bridges
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;