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
const db = getDatabase(app);

const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let tempCustomerPhoto = "", selectedCloth = null, storePhone = "", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 
window.activeGreetings = []; let gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    onValue(ref(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            document.getElementById('ai-input').placeholder = data.searchHint || "Search...";
            if (data.phone) storePhone = data.phone.toString().replace(/\D/g, ''); 
            if (data.profileImage) {
                const img = document.getElementById('owner-img');
                if(img) img.src = data.profileImage;
            }
            if (data.greetingsEnabled) {
                window.activeGreetings = data.customGreetings || ["Welcome!"];
                document.getElementById('dynamic-greeting').style.display = 'block';
            }
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
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

// --- RENDER CART CONTENT (FIXES BLUR ISSUE) ---
window.openCart = () => {
    const modal = document.getElementById('fitting-room-modal');
    const resultDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    
    if (cart.length === 0) {
        resultDiv.innerHTML = `<div style="padding:40px; text-align:center; color:white;"><h3>Your Cart is Empty</h3><button onclick="window.closeFittingRoom()" style="background:#e60023; color:white; border:none; padding:10px 20px; border-radius:8px; margin-top:10px;">Continue Shopping</button></div>`;
        return;
    }

    let total = cart.reduce((sum, item) => sum + item.price, 0);
    let itemsHTML = cart.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #555; padding-bottom:10px; color:white;">
            <div style="text-align:left;"><p style="margin:0; font-weight:bold;">${item.name}</p><p style="margin:0; color:#e60023;">₦${item.price.toLocaleString()}</p></div>
            <button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>`).join('');

    resultDiv.innerHTML = `
        <div style="padding:10px; color:white;">
            <h2 style="margin-top:0;">YOUR CART</h2>
            <div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div>
            <div style="display:flex; justify-content:space-between; font-weight:800; margin:20px 0; border-top: 2px solid #e60023; padding-top:15px;">
                <span>Total:</span> <span>₦${total.toLocaleString()}</span>
            </div>
            <button onclick="window.checkoutWhatsApp()" style="width:100%; padding:18px; background:#25D366; color:white; border-radius:12px; border:none; font-weight:bold; cursor:pointer;">
                <i class="fab fa-whatsapp"></i> Checkout via WhatsApp
            </button>
        </div>`;
};

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ 1x ${i.name} - ₦${i.price.toLocaleString()}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    window.open(`https://wa.me/${storePhone}?text=Order:%0A${list}%0A%0ATOTAL:%20₦${total.toLocaleString()}`);
};

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const sendBtn = document.getElementById('send-btn');
    if (micBtn) {
        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (Speech) {
            const rec = new Speech();
            micBtn.onclick = () => { micBtn.style.color = "#e60023"; rec.start(); };
            rec.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); };
            rec.onend = () => { micBtn.style.color = "#5f6368"; };
        }
    }
    // --- ENABLE SEND ICON ---
    if (sendBtn) { sendBtn.onclick = () => window.executeSearch(); }
}

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="font-weight:800; color:white;">AI Showroom</h2>
            <p style="color:white; font-weight:bold;">Upload body photo (capturing from head to toe)</p>
            <input type="file" id="temp-tryon-input" hidden accept="image/*" onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; cursor:pointer;">Select from Gallery</button>
        </div>`;
};

window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.addToCart = () => { cart.push(selectedCloth); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); showToast("✅ Added!"); window.closeFittingRoom(); };
async function getBase64FromUrl(url) { return new Promise(res => { fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.blob()).then(b => { const rd = new FileReader(); rd.onloadend = () => res(rd.result.split(',')[1]); rd.readAsDataURL(b); }); }); }
async function resizeImage(b) { return new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); const M = 1024; let w = i.width, h = i.height; if (w > h) { if (w > M) { h *= M/w; w = M; } } else { if (h > M) { w *= M/h; h = M; } } c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(i, 0, 0, w, h); r(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; i.src = b; }); }
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }
window.handleCustomerUpload = (e) => { const reader = new FileReader(); reader.onload = async (ev) => { tempCustomerPhoto = await resizeImage(ev.target.result); window.startTryOn(); }; reader.readAsDataURL(e.target.files[0]); };