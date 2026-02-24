import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAhzPRw3Gw4nN1DlIxDa1KszH69I4bcHPE",
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e",
    measurementId: "G-PJZD5D3NF6",
    databaseURL: "https://kingsleystoreai-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, "https://kingsleystoreai-default-rtdb.firebaseio.com");

const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let tempCustomerPhoto = ""; 
let selectedCloth = null;
let cart = []; 
let storePhone = "2348000000000"; 
let storeCatalog = []; 

window.activeGreetings = []; 
let gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const storeRef = ref(db, `stores/${currentStoreId}`);
    onValue(storeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || currentStoreId.toUpperCase() + " STORE";
            
            if (data.profileImage) {
                const ownerImg = document.getElementById('owner-img');
                if(ownerImg) { ownerImg.src = data.profileImage; ownerImg.style.display = 'block'; }
            }
            if (data.phone) storePhone = data.phone;
            
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled === false) {
                window.activeGreetings = []; 
                if (greetingEl) { greetingEl.style.display = 'none'; greetingEl.innerText = ''; }
            } else {
                if (greetingEl) greetingEl.style.display = 'block';
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) 
                    ? data.customGreetings 
                    : ["Nne, what are you looking for today?", "My guy, what are you looking for today?", "Chief, looking for premium native?"];
            }

            setTimeout(() => {
                const qsArray = (data.quickSearches && data.quickSearches.length > 0) ? data.quickSearches : ["Native Wear", "Jeans"];
                const container = document.getElementById('quick-search-container');
                if (container) {
                    container.style.display = 'flex';
                    container.style.gap = '15px';
                    container.style.overflowX = 'auto'; 
                    container.innerHTML = qsArray.map(tag => `<div class="search-card" onclick="window.quickSearch('${tag}')"><strong>${tag}</strong></div>`).join('');
                }
            }, 150);

            if (data.catalog) {
                storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
            }
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && window.activeGreetings.length > 0) { 
            el.innerText = window.activeGreetings[gIndex % window.activeGreetings.length]; 
            gIndex++; 
        }
    }, 2500);

    initVoiceSearch();
    updateCartUI();
});

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    tempCustomerPhoto = ""; 
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resultDiv = document.getElementById('ai-fitting-result');
    resultDiv.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="font-weight:800; color:#e60023;">AI Showroom</h2>
            <p style="color:var(--text-main); margin-bottom:20px;">Try on <strong>${selectedCloth.name}</strong>.</p>
            <input type="file" id="temp-tryon-input" hidden accept="image/*" onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">
                <i class="fas fa-camera"></i> Upload Your Photo
            </button>
        </div>`;
};

window.handleCustomerUpload = (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        tempCustomerPhoto = await resizeImage(event.target.result);
        window.startTryOn();
    };
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

window.startTryOn = async () => {
    const resultDiv = document.getElementById('ai-fitting-result');
    resultDiv.innerHTML = `<div class="loader-container"><div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><p style="margin-top:20px; font-weight:800;">STITCHING YOUR LOOK...</p></div>`;
    
    try {
        const imageSource = selectedCloth.imgUrl;
        const rawClothData = await getBase64FromUrl(imageSource);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: tempCustomerPhoto, clothImage: rawClothData, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        
        if (result.success) {
            resultDiv.innerHTML = `
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px; border:1px solid #e60023; margin-top:20px;">
                <div style="margin-top:15px; display:flex; flex-direction:column; gap:10px;">
                    <button id="add-to-cart-dynamic" onclick="window.addToCart()" style="width:100%; padding:18px; background:var(--accent); color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">
                        Add to Cart 🛍️
                    </button>
                    <div id="proceed-btn-container" style="${cart.length > 0 ? 'display:block' : 'display:none'}">
                        <button onclick="window.openCart()" style="width:100%; padding:15px; background:transparent; color:var(--text-main); border:1px solid var(--border); border-radius:12px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer;">
                            Proceed to Cart <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>`;
        } else { throw new Error(result.error || "AI failed."); }
    } catch (e) { alert("Error: " + e.message); window.closeFittingRoom(); }
};

window.addToCart = () => {
    const btn = document.getElementById('add-to-cart-dynamic');
    if (btn && btn.innerText.includes("Add to Cart")) {
        cart.push(selectedCloth);
        updateCartUI();
        showToast(`✅ Added!`);
        btn.innerText = "Check another one";
        btn.style.background = "#eee"; btn.style.color = "#333";
        const p = document.getElementById('proceed-btn-container'); 
        if(p) p.style.display = 'block';
    } else { window.closeFittingRoom(); }
};

window.openCart = () => {
    window.closeFittingRoom();
    const modal = document.getElementById('fitting-room-modal');
    const resultDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    if (cart.length === 0) { resultDiv.innerHTML = `<h3>Empty Cart</h3>`; return; }
    
    let total = cart.reduce((sum, item) => sum + item.price, 0);
    let itemsHTML = cart.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <div style="text-align:left;"><p style="margin:0; font-weight:bold;">${item.name}</p></div>
            <button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; cursor:pointer;">✕</button>
        </div>`).join('');
        
    resultDiv.innerHTML = `<div style="padding:10px;"><h2>YOUR CART</h2>${itemsHTML}<div style="margin:20px 0; border-top:1px solid #333; padding-top:15px;">Total: ₦${total.toLocaleString()}</div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:18px; background:#25D366; color:white; border-radius:12px; border:none; font-weight:bold;">Checkout WhatsApp</button></div>`;
};

window.checkoutWhatsApp = () => {
    let waMessage = `I want to buy:\n` + cart.map(i => `▪ ${i.name}`).join('\n');
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(waMessage)}`, '_blank');
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query));
    results.style.display = 'grid';
    results.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4 style="color:white;">${item.name}</h4><p>₦${item.price.toLocaleString()}</p></div>`).join('');
};

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    micBtn.addEventListener('click', () => { recognition.start(); });
    recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); };
}

async function resizeImage(base64Str) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_SIDE = 1024; let w = img.width, h = img.height; if (w > h) { if (w > MAX_SIDE) { h *= MAX_SIDE / w; w = MAX_SIDE; } } else { if (h > MAX_SIDE) { w *= MAX_SIDE / h; h = MAX_SIDE; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]); }; img.src = base64Str; }); }

// 🎯 THE ULTIMATE FIX: BLOB-FETCH WITH PROXY FALLBACK
async function getBase64FromUrl(url) { 
    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        throw new Error("Security Block prevented image loading. Try again or check image URL.");
    }
}

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }
window.removeFromCart = (idx) => { cart.splice(idx, 1); updateCartUI(); window.openCart(); };