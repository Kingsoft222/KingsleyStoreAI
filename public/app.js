import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
};
initializeApp(firebaseConfig);

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k", cat: "Native" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k", cat: "Native" },
    { id: 3, name: "Classic White Polo", tags: "white polo", img: "white_polo.jpg", price: "₦10k", cat: "Corporate" },
    { id: 4, name: "Urban Baggy Jeans", tags: "jeans denim baggy", img: "baggy_jeans.jpg", price: "₦28k", cat: "Casual" },
    { id: 5, name: "Royal Bridal Gown", tags: "wedding gown bridal", img: "wedding_gown.jpg", price: "₦150k", cat: "Bridal" }
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
let userPhotoRaw = "";
let selectedCloth = null;
const ADMIN_PHONE = "2348000000000";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Restore Profile Lock
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) {
        document.getElementById('owner-img').src = saved;
        userPhotoRaw = saved;
    }

    // 2. Restore Greeting Cycle
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2500);

    // 3. Mic Voice Search
    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        micBtn.onclick = () => { rec.start(); micBtn.style.color = "#e60023"; };
        rec.onresult = (e) => {
            document.getElementById('ai-input').value = e.results[0][0].transcript;
            micBtn.style.color = "#5f6368";
            window.executeSearch();
        };
    }
});

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        const imgData = event.target.result;
        document.getElementById('owner-img').src = imgData;
        localStorage.setItem('kingsley_profile_locked', imgData);
        userPhotoRaw = await resizeImage(imgData);
        if (selectedCloth) window.startTryOn(); // Continue flow if cloth was picked
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!input) { results.style.display = 'none'; return; }
    
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || 
        item.tags.split(' ').includes(input)
    );

    results.style.display = 'grid';
    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="images/${item.img}" alt="${item.name}">
            <h4 style="margin:8px 0;">${item.name}</h4>
            <p style="color:#e60023; font-weight:bold;">${item.price}</p>
        </div>`).join('');
};

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
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        img.src = base64Str;
    });
}

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';

    if (!userPhotoRaw) {
        resultDiv.innerHTML = `
            <div style="padding:20px;">
                <h2 style="font-weight:800; color:var(--accent); margin-bottom:15px;">AI Showroom</h2>
                <button onclick="document.getElementById('profile-input').click()" style="width:100%; padding:18px; background:var(--accent); color:white; border:none; border-radius:15px; font-weight:bold; cursor:pointer;">Upload your standing image</button>
            </div>`;
    } else {
        window.startTryOn();
    }
};

window.startTryOn = async () => {
    const resultDiv = document.getElementById('ai-fitting-result');
    resultDiv.innerHTML = `<div style="padding:40px; text-align:center;"><div class="loading-spinner"></div><p style="margin-top:15px; font-weight:bold;">Stitching...</p></div>`;
    
    try {
        const res = await fetch(`images/${selectedCloth.img}`);
        const blob = await res.blob();
        const clothB64 = await new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); });
        const processedCloth = await resizeImage(clothB64);
        
        const response = await fetch('/api/process-vto', { method: 'POST', body: JSON.stringify({ userImage: userPhotoRaw, clothImage: processedCloth, category: selectedCloth.cat }) });
        const result = await response.json();
        
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="width:100%; display:flex; justify-content:flex-end; margin-bottom:10px;">
                    <span onclick="window.closeFittingRoom()" style="color:var(--accent); font-weight:bold; cursor:pointer; font-size:0.85rem;">try another look</span>
                </div>
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:15px; margin-bottom:15px; border: 1px solid var(--border);">
                <button onclick="window.open('https://wa.me/${ADMIN_PHONE}?text=Order%20${selectedCloth.name}')" style="width:100%; padding:18px; background:#28a745; color:white; border:none; border-radius:12px; font-weight:bold;">add to cart 🛍️</button>`;
        } else { throw new Error(result.error); }
    } catch (e) { alert("Error: " + e.message); window.closeFittingRoom(); }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.clearProfileData = () => { localStorage.removeItem('kingsley_profile_locked'); userPhotoRaw = ""; location.reload(); };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };