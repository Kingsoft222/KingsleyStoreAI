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

let tempCustomerPhoto = "", selectedCloth = null, storePhone = "", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 
window.activeGreetings = []; let gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    onValue(ref(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            document.getElementById('ai-input').placeholder = data.searchHint || "Search...";
            
            // WHATSAPP FIX: Ensure country code is clean
            if (data.phone) {
                let p = data.phone.toString().trim();
                storePhone = p.startsWith('+') ? p.substring(1) : p;
            }

            if (data.profileImage) {
                const ownerImg = document.getElementById('owner-img');
                if(ownerImg) { ownerImg.src = data.profileImage; ownerImg.style.display = 'block'; }
            }
            
            if (data.greetingsEnabled === true) {
                window.activeGreetings = data.customGreetings || ["Welcome!"];
                document.getElementById('dynamic-greeting').style.display = 'block';
            }

            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
        }
    });
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && window.activeGreetings.length > 0) { el.innerText = window.activeGreetings[gIndex % window.activeGreetings.length]; gIndex++; }
    }, 2500);
    updateCartUI();
});

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="font-weight:800; color:white;">AI Showroom</h2>
            <p style="color:white; font-weight:bold;">Try on <strong>${selectedCloth.name}</strong>.</p>
            <p style="color:white; font-size:0.9rem; margin-bottom:15px;">Upload body photo (capturing from head to toe)</p>
            <input type="file" id="temp-tryon-input" hidden accept="image/*" onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; border:none; font-weight:bold; cursor:pointer;">Select from Gallery</button>
        </div>`;
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div class="loader-container">
            <div class="rotating-dots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
            <p style="margin-top:20px; font-weight:800; color:white;">STITCHING YOUR OUTFIT...</p>
        </div>`;
    
    try {
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: tempCustomerPhoto, clothImage: rawCloth, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px; margin-top:20px;">
                <div style="margin-top:15px; display:flex; flex-direction:column; gap:10px;">
                    <button id="add-to-cart-dynamic" onclick="window.addToCart()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold;">Add to Cart 🛍️</button>
                    <button onclick="window.openCart()" style="width:100%; padding:15px; background:transparent; color:white; border:1px solid white; border-radius:12px; font-weight:bold;">Proceed to Cart <i class="fas fa-arrow-right"></i></button>
                </div>`;
        }
    } catch (e) { alert("Error. Please refresh."); window.closeFittingRoom(); }
};

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ 1x ${i.name} - ₦${i.price.toLocaleString()}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    // FORCE PLUS LOGIC FOR WA.ME
    window.open(`https://wa.me/${storePhone}?text=Hello%20${currentStoreId},%20I%20want%20to%20pay%20for:%0A${list}%0A%0A*TOTAL:%20₦${total.toLocaleString()}*`);
};

window.handleCustomerUpload = (e) => {
    const reader = new FileReader();
    reader.onload = async (ev) => { tempCustomerPhoto = await resizeImage(ev.target.result); window.startTryOn(); };
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

async function getBase64FromUrl(url) { 
    return new Promise((resolve) => {
        fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
            .then(r => r.blob()).then(b => {
                const rd = new FileReader(); rd.onloadend = () => resolve(rd.result.split(',')[1]); rd.readAsDataURL(b);
            });
    });
}

window.addToCart = () => { cart.push(selectedCloth); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); showToast("✅ Added!"); window.closeFittingRoom(); };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }
async function resizeImage(b64) { return new Promise(r => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 1024; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); r(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]); }; img.src = b64; }); }