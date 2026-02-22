import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
};
initializeApp(firebaseConfig);

let userPhotoRaw = "";
let selectedCloth = null;
const ADMIN_PHONE = "2348000000000"; 

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25,000", cat: "Native" },
    { id: 2, name: "Classic White Polo", img: "white_polo.jpg", price: "₦10,000", cat: "Corporate" },
    { id: 3, name: "Urban Baggy Jeans & Sneakers", img: "baggy_jeans.jpg", price: "₦28,000", cat: "Casual" },
    { id: 4, name: "Royal Bridal Gown", img: "wedding_gown.jpg", price: "₦150,000", cat: "Bridal" }
];

async function resizeImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIDE = 1024;
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
            resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
        };
        img.src = base64Str;
    });
}

// ... helper functions for base64 and catalog rendering ...
async function getBase64FromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

export function executeSearch(filter = 'All') {
    const results = document.getElementById('ai-results');
    results.style.display = 'grid';
    const filtered = filter === 'All' ? clothesCatalog : clothesCatalog.filter(c => c.cat === filter);
    results.innerHTML = filtered.map(item => `
        <div class="card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="/images/${item.img}" style="width:100%; border-radius:10px;">
            <div style="padding:10px;">
                <small>${item.cat}</small>
                <h3>${item.name}</h3>
                <p style="color:#e60023; font-weight:800;">${item.price}</p>
            </div>
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
    reader.onload = async (event) => {
        userPhotoRaw = await resizeImage(event.target.result);
        startVertexModeling();
    };
    reader.readAsDataURL(file);
}

async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    let timeLeft = 35;
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:#111;">
            <div style="position:relative; width:130px; height:130px;">
                <div class="spinner-ring" style="width:100%; height:100%; border: 9px solid rgba(255,255,255,0.05); border-top: 9px solid #e60023; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <div id="timer-count" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:white; font-size:1.8rem; font-weight:900;">${timeLeft}s</div>
            </div>
            <p style="color:white; margin-top:20px; font-weight:bold;">Analyzing your photo...</p>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;

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
            body: JSON.stringify({ 
                userImage: userPhotoRaw, 
                clothImage: clothB64,
                category: selectedCloth.cat 
            })
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
        alert("Error: " + e.message);
        location.reload();
    }
}

function displayFinalResult(src) {
    const container = document.getElementById('video-main-container');
    container.style.display = "flex";
    container.style.flexDirection = "column";

    container.innerHTML = `
        <div style="width:100%; display:flex; justify-content:flex-end; padding:15px;">
            <a href="#" onclick="location.reload()" style="color:#e60023; font-weight:bold; text-decoration:none; font-size:0.85rem;">✕ try another look</a>
        </div>
        <div style="text-align:center; flex-grow:1; display:flex; align-items:center; justify-content:center; padding: 5px;">
            <img src="${src}" style="width:100%; height:auto; max-height:75vh; object-fit:contain; border-radius:12px; border:1px solid #e60023;">
        </div>
        <div style="padding: 20px; width:100%; text-align:center;">
            <button onclick="window.open('https://wa.me/${ADMIN_PHONE}')" style="background:#e60023; color:white; border:none; padding:18px; border-radius:40px; width:90%; font-weight:bold; font-size:1.1rem; cursor:pointer;">
                add to cart 🛍️
            </button>
        </div>`;
}

window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;