import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// 1. Firebase Configuration
const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
};
initializeApp(firebaseConfig);

let userPhotoRaw = "";
let selectedCloth = null;

// 2. Updated Catalog with Bridal Gown
const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k", cat: "Native" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k", cat: "Native" },
    { id: 3, name: "Royal Bridal Gown", img: "wedding_gown.jpg", price: "₦150k", cat: "Bridal" }
];

// 3. Helper: Resize Image (To prevent the "Too Big" error)
async function resizeImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIDE = 1024; // Standard resolution for Google AI
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE; }
            } else {
                if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        img.src = base64Str;
    });
}

// 4. Helper: Get Image from URL
async function getBase64FromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// 5. Render the Catalog (Search/Filter)
export function executeSearch(filter = 'All') {
    const results = document.getElementById('ai-results');
    results.style.display = 'grid';
    
    const filtered = filter === 'All' ? clothesCatalog : clothesCatalog.filter(c => c.cat === filter);

    results.innerHTML = filtered.map(item => `
        <div class="card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="/images/${item.img}" style="width:100%; border-radius:10px;">
            <div style="padding:10px;">
                <small style="color:#888;">${item.cat}</small>
                <h3 style="margin:5px 0; font-size: 1.1rem;">${item.name}</h3>
                <p style="color:#e60023; font-weight:800; margin:0;">${item.price}</p>
            </div>
        </div>`).join('');
}

// 6. Handle Item Selection
export function promptShowroomChoice(id) {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
}

// 7. Handle User Image Upload
export function handleUserFitUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        userPhotoRaw = await resizeImage(event.target.result);
        startVertexModeling();
    };
    reader.readAsDataURL(file);
}

// 8. Call Vercel API
async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 35;
    container.innerHTML = `
        <div class="mall-loader-container" style="text-align:center; padding:50px 20px;">
            <div class="spinner-ring"></div>
            <h2 id="timer-count" style="color:#e60023; font-size: 3rem; margin:15px 0;">${timeLeft}s</h2>
            <p style="color:white; font-weight:900; letter-spacing:1px;">AI IS TAILORING YOUR GOWN...</p>
        </div>`;

    const timer = setInterval(() => {
        if (timeLeft > 0) timeLeft--;
        const el = document.getElementById('timer-count');
        if (el) el.innerText = timeLeft + "s";
    }, 1000);

    try {
        const rawClothData = await getBase64FromUrl(`/images/${selectedCloth.img}`);
        const clothB64 = await resizeImage(rawClothData);
        
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
        alert("STITCHING ERROR: " + e.message);
        location.reload();
    }
}

// 9. Display AI Render
function displayFinalResult(src) {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `
        <div class="result-wrapper" style="text-align:center; padding:10px;">
            <img src="${src}" style="max-width:100%; border:3px solid #e60023; border-radius:15px; box-shadow: 0 0 25px rgba(0,0,0,0.6);">
        </div>
        <div class="vto-action-footer" style="padding:25px; text-align:center;">
            <button onclick="location.reload()" style="background:#e60023; color:white; border:none; padding:18px 35px; border-radius:35px; font-weight:bold; cursor:pointer; width:80%; font-size:1.1rem;">TRY ANOTHER STYLE</button>
        </div>`;
}

// 10. Global Scope Exports
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;