/**
 * Kingsley Store AI - Core Logic v7.0
 * INTEGRATED: Stable VTO Engine + Preserved UI Logic
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
};
initializeApp(firebaseConfig);

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native traditional", img: "senator_red.jpg", price: "₦25,000", cat: "Native" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native traditional", img: "ankara_blue.jpg", price: "₦22,000", cat: "Native" },
    { id: 3, name: "Classic White Polo", tags: "white polo shirt corporate top", img: "white_polo.jpg", price: "₦10,000", cat: "Corporate" },
    { id: 4, name: "Urban Baggy Jeans", tags: "jeans denim baggy casual pants blue", img: "baggy_jeans.jpg", price: "₦28,000", cat: "Casual" },
    { id: 5, name: "Royal Bridal Gown", tags: "wedding gown bridal dress white long gown", img: "wedding_gown.jpg", price: "₦150,000", cat: "Bridal" }
];

const greetings = [
    "Nne, what are you looking for today?", "My guy, what are you looking for today?",
    "Classic Babe, what are you looking for today?", "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?", "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhotoRaw = "";
let selectedCloth = null;
let cartCount = 0;
const ADMIN_PHONE = "2348000000000"; 

// --- 1. BOOTSTRAP & PROFILE ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhotoRaw = saved;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2000);

    // Mic logic preserved
    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
        rec.onresult = (e) => {
            document.getElementById('ai-input').value = e.results[0][0].transcript;
            micBtn.style.color = "#5f6368";
            window.executeSearch();
        };
    }
});

// --- 2. PRECISE SEARCH & TAG FILTERING ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    
    if (!input) {
        results.style.display = 'none';
        return;
    }

    // Precise Filter: Matches name OR specific tags
    const matched = clothesCatalog.filter(item =>
        item.name.toLowerCase().includes(input) || 
        item.tags.toLowerCase().split(' ').some(tag => tag === input || input.includes(tag))
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        results.innerHTML = `<p style="color:white; grid-column: 1/-1; text-align:center;">No ${input} found in boutique.</p>`;
    }
};

window.quickSearch = (q) => { 
    document.getElementById('ai-input').value = q; 
    window.executeSearch(); 
};

// --- 3. STABLE IMAGE RESIZER (Proportional) ---
async function resizeImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIDE = 1024;
            let width = img.width; let height = img.height;
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

// --- 4. SHOWROOM & VTO ENGINE ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('modal-subtext').innerText = "VTO Showroom: " + selectedCloth.name;
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="text-align:center; padding:20px;">
            <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; width:100%;">📸 Upload Photo to Try-On</button>
        </div>
    `;
};

window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        userPhotoRaw = await resizeImage(event.target.result);
        startVertexModeling();
    };
    reader.readAsDataURL(file);
};

async function startVertexModeling() {
    const modal = document.getElementById('fitting-room-modal');
    const resultDiv = document.getElementById('ai-fitting-result');
    const subtext = document.getElementById('modal-subtext');
    
    subtext.innerText = "Stitching your look...";
    resultDiv.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px;">
            <i class="fas fa-spinner fa-spin fa-3x" style="color:#e60023; margin-bottom:15px;"></i>
            <p style="color:white; font-weight:bold;">Tailoring in progress...</p>
        </div>
    `;

    try {
        const rawClothData = await getBase64FromUrl(`images/${selectedCloth.img}`);
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
        if (result.success) {
            subtext.innerText = "You look amazing!";
            const msg = encodeURIComponent(`Hello Kingsley! I want to order:\n\n*Item:* ${selectedCloth.name}\n*Price:* ${selectedCloth.price}`);
            
            resultDiv.innerHTML = `
                <div style="text-align:center;">
                    <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:15px; border:1px solid #e60023;">
                    <button onclick="window.open('https://wa.me/${ADMIN_PHONE}?text=${msg}')" class="primary-btn" style="background:#28a745; color:white; margin-top:20px; width:100%;">add to cart 🛍️</button>
                </div>
            `;
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        alert("Stitching Error: " + e.message);
        window.closeFittingRoom();
    }
}

// --- 5. UTILS ---
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };

// Exports
window.handleUserFitUpload = handleUserFitUpload;