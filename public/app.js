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

// --- NEW RESIZER LOGIC ---
export function handleUserFitUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize to max 1024px side (Prevents OpenCV crash)
            const MAX_SIDE = 1024;
            if (width > height) {
                if (width > MAX_SIDE) {
                    height *= MAX_SIDE / width;
                    width = MAX_SIDE;
                }
            } else {
                if (height > MAX_SIDE) {
                    width *= MAX_SIDE / height;
                    height = MAX_SIDE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG (Smaller payload, more compatible)
            userPhotoRaw = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            startVertexModeling();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 35;
    container.innerHTML = `
        <div class="mall-loader-container">
            <div class="spinner-ring"></div>
            <h2 id="timer-count" style="color:#e60023; font-size: 3rem;">${timeLeft}s</h2>
            <p style="color:white; font-weight:900;">AI IS RENDERING YOUR LOOK...</p>
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
            throw new Error(result.error);
        }
    } catch (e) {
        clearInterval(timer);
        alert("STITCHING FAILED: " + e.message);
        location.reload();
    }
}

function displayFinalResult(src) {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `
        <div class="result-wrapper">
            <img src="${src}" style="max-width:90%; border:3px solid #e60023; border-radius:15px;">
        </div>
        <div class="vto-action-footer">
            <button id="vto-add-to-cart" onclick="location.reload()">ORDER THIS LOOK 🛍️</button>
        </div>`;
}

window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;