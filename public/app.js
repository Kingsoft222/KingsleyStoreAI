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

let tempCustomerPhoto = "", selectedCloth = null, storePhone = "2348000000000", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 

document.addEventListener('DOMContentLoaded', () => {
    onValue(ref(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            if (data.profileImage) { document.getElementById('owner-img').src = data.profileImage; }
            
            // --- WHATSAPP SEND BUTTON LOGIC ---
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
            updateCartUI();
        }
    });
});

// --- CART TAP RESPONSIVENESS ---
window.updateCartUI = () => {
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.innerText = cart.length;
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="text-align:center; padding:20px;">
            <h2 style="color:white;">AI Showroom</h2>
            <p style="color:white; font-weight:bold;">Upload body photo (capturing from head to toe)</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer;">Select from Gallery</button>
        </div>`;
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    // RESTORED CIRCULAR SPINNER
    resDiv.innerHTML = `<div class="loader-container"><div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><p style="color:white; margin-top:20px; font-weight:800;">STITCHING YOUR OUTFIT...</p></div>`;
    try {
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: tempCustomerPhoto, clothImage: rawCloth, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `<img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px;">
            <button onclick="window.addToCart()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; margin-top:15px; cursor:pointer;">Add to Cart 🛍️</button>`;
        }
    } catch (e) { alert("Error. Try again."); window.closeFittingRoom(); }
};

window.addToCart = () => {
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI();
    showToast("✅ Added!");
    window.closeFittingRoom();
};

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ 1x ${i.name}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    // FIXED SEND ICON LOGIC
    window.open(`https://wa.me/${storePhone.replace('+', '')}?text=Order:%0A${list}%0A%0ATOTAL: ₦${total.toLocaleString()}`);
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
async function getBase64FromUrl(url) { return new Promise((resolve) => { fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.blob()).then(b => { const rd = new FileReader(); rd.onloadend = () => resolve(rd.result.split(',')[1]); rd.readAsDataURL(b); }); }); }
async function resizeImage(b64) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 1024; let w = img.width, h = img.height; if (w > h) { h *= MAX/w; w = MAX; } else { w *= MAX/h; h = MAX; } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]); }; img.src = b64; }); }
window.handleCustomerUpload = (e) => { const reader = new FileReader(); reader.onload = async (ev) => { tempCustomerPhoto = await resizeImage(ev.target.result); window.startTryOn(); }; reader.readAsDataURL(e.target.files[0]); };
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }