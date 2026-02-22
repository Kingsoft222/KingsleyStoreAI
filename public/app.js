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
    { id: 1, name: "Premium Red Luxury Native", tags: "native senator red", img: "senator_red.jpg", price: "₦25,000", cat: "Native" },
    { id: 2, name: "Classic White Polo", tags: "polo white corporate", img: "white_polo.jpg", price: "₦10,000", cat: "Corporate" },
    { id: 3, name: "Urban Baggy Jeans", tags: "jeans denim baggy", img: "baggy_jeans.jpg", price: "₦28,000", cat: "Casual" },
    { id: 4, name: "Royal Bridal Gown", tags: "wedding gown bridal", img: "wedding_gown.jpg", price: "₦150,000", cat: "Bridal" }
];

const greetings = [
    "Nne, what are you looking for today?", 
    "My guy, what are you looking for today?", 
    "Classic Man, what are you looking for today?",
    "Chief, looking for premium native?",
    "Boss, let's find your style!"
];
let gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    // 1. GREETINGS
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { 
            el.innerText = greetings[gIndex % greetings.length]; 
            gIndex++; 
        }
    }, 2500);

    // 2. PROFILE DATA
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) {
        document.getElementById('owner-img').src = saved;
        resizeImage(saved).then(resized => { userPhotoRaw = resized; });
    }
});

// --- STABLE AI PROCESSING LOGIC ---
async function resizeImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIDE = 1024;
            let width = img.width, height = img.height;
            if (width > height) { if (width > MAX_SIDE) { height *= MAX_SIDE / width; width = MAX_SIDE; } }
            else { if (height > MAX_SIDE) { width *= MAX_SIDE / height; height = MAX_SIDE; } }
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

// --- UPDATED SEARCH: SHOWS ALL MATCHING CLOTHES ---
window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    
    // If search is empty, show everything. If typing, filter properly.
    const filtered = !query 
        ? clothesCatalog 
        : clothesCatalog.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.tags.toLowerCase().includes(query) ||
            c.cat.toLowerCase().includes(query)
        );

    results.style.display = 'grid';
    results.innerHTML = filtered.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="images/${item.img}">
            <h4 style="margin:8px 0; color:white;">${item.name}</h4>
            <p style="color:#e60023; font-weight:bold;">${item.price}</p>
        </div>`).join('');
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resultDiv = document.getElementById('ai-fitting-result');
    
    if (!userPhotoRaw) {
        resultDiv.innerHTML = `
            <div style="padding:20px; text-align:center;">
                <h2 style="font-weight:800; color:#e60023;">AI Showroom</h2>
                <button onclick="document.getElementById('profile-input').click()" style="width:100%; padding:15px; background:#e60023; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">Upload Standing Image</button>
            </div>`;
    } else {
        window.startTryOn();
    }
};

window.startTryOn = async () => {
    const resultDiv = document.getElementById('ai-fitting-result');
    resultDiv.innerHTML = `
        <div class="loader-container">
            <div class="rotating-dots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
            <p style="margin-top:20px; font-weight:800; color:var(--text-main);">STITCHING YOUR LOOK...</p>
        </div>`;
    
    try {
        const rawClothData = await getBase64FromUrl(`images/${selectedCloth.img}`);
        const clothB64 = await resizeImage(rawClothData);

        const response = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: userPhotoRaw, clothImage: clothB64, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="width:100%; text-align:right; margin-bottom:10px;">
                    <span onclick="window.closeFittingRoom()" style="color:#e60023; font-weight:bold; cursor:pointer;">✕ Try Another Look</span>
                </div>
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px; border:1px solid #e60023;">
                <button onclick="window.open('https://wa.me/${ADMIN_PHONE}?text=Order%20${encodeURIComponent(selectedCloth.name)}')" style="width:100%; padding:18px; background:#28a745; color:white; border:none; border-radius:12px; font-weight:bold; margin-top:15px; cursor:pointer;">Add to Cart 🛍️</button>`;
        } else { throw new Error(result.error); }
    } catch (e) { 
        alert("AI error. Please ensure the photo shows your full body."); 
        window.closeFittingRoom(); 
    }
};

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        const originalData = event.target.result;
        localStorage.setItem('kingsley_profile_locked', originalData);
        document.getElementById('owner-img').src = originalData;
        userPhotoRaw = await resizeImage(originalData);
        window.startTryOn();
    };
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.clearProfileData = () => { localStorage.removeItem('kingsley_profile_locked'); userPhotoRaw = ""; location.reload(); };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };