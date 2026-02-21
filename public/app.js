import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
};
initializeApp(firebaseConfig);

let userPhotoRaw = "";
let selectedCloth = null;

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

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
        startVertexModeling();
    };
    reader.readAsDataURL(file);
}

async function startVertexModeling() {
    if (!selectedCloth) return alert("Select a cloth first!");
    
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 35;
    container.innerHTML = `
        <div class="mall-loader-container">
            <div class="spinner-ring"></div>
            <h2 id="timer-count" style="color:#e60023; font-size: 3rem;">${timeLeft}s</h2>
            <p style="color:white; font-weight:900;">KINGSLEY AI IS SEWING YOUR LOOK...</p>
        </div>`;

    const timer = setInterval(() => {
        if (timeLeft > 0) timeLeft--;
        const el = document.getElementById('timer-count');
        if (el) el.innerText = timeLeft + "s";
    }, 1000);

    try {
        const clothB64 = await getBase64FromUrl(`/images/${selectedCloth.img}`);
        
        const response = await fetch('/api/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhotoRaw, clothImage: clothB64 })
        });

        const result = await response.json();
        clearInterval(timer);

        if (result.success) {
            displayFinalResult(`data:image/jpeg;base64,${result.image}`);
        } else {
            throw new Error(result.error || "AI Stitching failed.");
        }
    } catch (e) {
        clearInterval(timer);
        alert("ERROR: " + e.message);
        location.reload();
    }
}

function displayFinalResult(src) {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `
        <div class="result-wrapper">
            <img src="${src}">
        </div>
        <div class="vto-action-footer">
            <button id="vto-add-to-cart" onclick="location.reload()">ORDER THIS LOOK 🛍️</button>
        </div>`;
}

window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;