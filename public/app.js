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
    "Nne, what are you looking for today?", "My guy, what are you looking for today?",
    "Classic Babe, what are you looking for today?", "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?", "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0, userPhotoRaw = "", selectedCloth = null;
const ADMIN_PHONE = "2348000000000";

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { document.getElementById('owner-img').src = saved; userPhotoRaw = saved; }
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2500);

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
        userPhotoRaw = imgData; 
        if (selectedCloth) window.startTryOn();
    };
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!input) { results.style.display = 'none'; return; }
    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input) || item.tags.split(' ').includes(input));
    results.style.display = 'grid';
    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="images/${item.img}" alt="${item.name}">
            <h4 style="margin:8px 0;">${item.name}</h4>
            <p style="color:#e60023; font-weight:bold;">${item.price}</p>
        </div>`).join('');
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resultDiv = document.getElementById('ai-fitting-result');
    if (!userPhotoRaw) {
        resultDiv.innerHTML = `<div style="padding:20px;"><h2 style="font-weight:800; color:var(--accent); margin-bottom:15px;">AI Showroom</h2><button onclick="document.getElementById('profile-input').click()" style="width:100%; padding:18px; background:var(--accent); color:white; border:none; border-radius:15px; font-weight:bold; cursor:pointer;">Upload your standing image</button></div>`;
    } else { window.startTryOn(); }
};

window.startTryOn = async () => {
    const resultDiv = document.getElementById('ai-fitting-result');
    // ROTATING DOTTED SPINNER INJECTED HERE
    resultDiv.innerHTML = `
        <div class="loader-container">
            <div class="rotating-dots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
            <p style="margin-top:20px; font-weight:800; color:var(--text-main); letter-spacing:1px;">STITCHING YOUR LOOK...</p>
        </div>`;
    
    try {
        const response = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: userPhotoRaw, clothImage: `images/${selectedCloth.img}`, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        if (result.success) {
            resultDiv.innerHTML = `<div style="width:100%; display:flex; justify-content:flex-end; margin-bottom:10px;"><span onclick="window.closeFittingRoom()" style="color:var(--accent); font-weight:bold; cursor:pointer; font-size:0.85rem;">try another look</span></div><img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:15px; margin-bottom:15px; border: 1px solid var(--border);"><button onclick="window.open('https://wa.me/${ADMIN_PHONE}?text=Hi Kingsley, I want to order the ${encodeURIComponent(selectedCloth.name)}')" style="width:100%; padding:18px; background:#28a745; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">add to cart 🛍️</button>`;
        } else { throw new Error(result.error); }
    } catch (e) { 
        alert("AI Processing Failed. Please ensure the photo shows your full body clearly."); 
        window.closeFittingRoom(); 
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.clearProfileData = () => { localStorage.removeItem('kingsley_profile_locked'); userPhotoRaw = ""; location.reload(); };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };