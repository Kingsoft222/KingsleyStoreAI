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

const greetings = [
    "Nne, what are you looking for today?", 
    "My guy, what are you looking for today?",
    "Classic Babe, what are you looking for today?", 
    "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?", 
    "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;

// Initialize Greetings and Profile on Load
document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2500);

    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) {
        const imgEl = document.getElementById('owner-img');
        if (imgEl) imgEl.src = saved;
        // Keep userPhotoRaw ready for immediate stitching
        resizeImage(saved).then(data => userPhotoRaw = data);
    }
});

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
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
        };
        img.src = base64Str;
    });
}

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
    const modal = document.getElementById('fitting-room-modal');
    modal.style.display = 'flex';
    
    // If user already has a photo, bypass the upload button and go straight to modeling
    if (userPhotoRaw) {
        startVertexModeling();
    } else {
        const resultDiv = document.getElementById('ai-fitting-result');
        resultDiv.innerHTML = `
            <div style="padding:20px;">
                <h2 style="font-weight:800; color:#e60023; margin-bottom:15px;">AI Showroom</h2>
                <button onclick="document.getElementById('profile-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border:none; border-radius:15px; font-weight:bold; cursor:pointer;">Upload your standing image</button>
            </div>`;
    }
}

export function handleUserFitUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        const originalData = event.target.result;
        // Save to profile for next time
        localStorage.setItem('kingsley_profile_locked', originalData);
        document.getElementById('owner-img').src = originalData;
        
        userPhotoRaw = await resizeImage(originalData);
        startVertexModeling();
    };
    reader.readAsDataURL(file);
}

async function startVertexModeling() {
    // Show the experience container
    const modal = document.getElementById('fitting-room-modal');
    modal.style.display = 'none';
    
    const expModal = document.getElementById('video-experience-modal');
    expModal.style.display = 'flex';
    
    const container = document.getElementById('video-main-container');
    
    // INJECTING YOUR ROTATING DOTTED SPINNER
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:var(--bg-main); color:var(--text-main);">
            <div class="loader-container">
                <div class="rotating-dots">
                    <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
                    <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
                </div>
            </div>
            <p style="margin-top:20px; font-weight:800; letter-spacing:1px;">STITCHING YOUR LOOK...</p>
        </div>`;

    try {
        const rawClothData = await getBase64FromUrl(`/images/${selectedCloth.img}`);
        const clothB64 = await resizeImage(rawClothClothData);
        
        const response = await fetch('/api/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userPhotoRaw, 
                clothImage: clothB64,
                category: selectedCloth.cat 
            })
        });
        
        const result = await response.json();
        if (result.success) { 
            displayFinalResult(`data:image/jpeg;base64,${result.image}`); 
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
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
            <button onclick="window.open('https://wa.me/${ADMIN_PHONE}?text=Order%20${encodeURIComponent(selectedCloth.name)}')" style="background:#e60023; color:white; border:none; padding:18px; border-radius:40px; width:90%; font-weight:bold; font-size:1.1rem; cursor:pointer;">
                add to cart 🛍️
            </button>
        </div>`;
}

// Exports
window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;
window.clearProfileData = () => { localStorage.removeItem('kingsley_profile_locked'); location.reload(); };