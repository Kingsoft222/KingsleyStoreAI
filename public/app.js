import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

document.addEventListener('DOMContentLoaded', () => {
    onValue(ref(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            document.getElementById('ai-input').placeholder = data.searchHint || "Search...";
            // --- WHATSAPP FIX ---
            if (data.phone) storePhone = data.phone.toString().replace(/\D/g, ''); 
            if (data.profileImage) {
                const img = document.getElementById('owner-img');
                if(img) img.src = data.profileImage;
            }
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
        }
    });
    initVoiceSearch();
    updateCartUI();
});

window.openCart = () => {
    const modal = document.getElementById('fitting-room-modal');
    const resultDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    if (cart.length === 0) { resultDiv.innerHTML = `<h3 style="color:white;text-align:center;">Cart Empty</h3>`; return; }
    
    let total = cart.reduce((s, i) => s + i.price, 0);
    let html = cart.map((i, idx) => `<div style="display:flex;justify-content:space-between;color:white;margin-bottom:10px;"><span>${i.name}</span><span>₦${i.price.toLocaleString()}</span><button onclick="window.removeFromCart(${idx})" style="color:red;background:none;border:none;">✕</button></div>`).join('');
    resultDiv.innerHTML = `<div style="padding:20px;color:white;"><h2>CART</h2>${html}<hr><h3>Total: ₦${total.toLocaleString()}</h3><button onclick="window.checkoutWhatsApp()" style="width:100%;padding:15px;background:#25D366;color:white;border-radius:10px;border:none;">WhatsApp Checkout</button></div>`;
};

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ ${i.name} - ₦${i.price.toLocaleString()}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    window.open(`https://wa.me/${storePhone}?text=Order%20Details:%0A${list}%0A%0ATOTAL:%20₦${total.toLocaleString()}`);
};

function initVoiceSearch() {
    const mic = document.getElementById('mic-btn');
    const snd = document.getElementById('send-btn');
    // --- ENABLE SEND AND MIC ---
    if (mic) {
        const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        mic.onclick = () => { mic.style.color = "red"; rec.start(); };
        rec.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); };
        rec.onend = () => { mic.style.color = "#5f6368"; };
    }
    if (snd) { snd.onclick = () => window.executeSearch(); }
}

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="text-align:center;padding:20px;">
            <h2 style="color:white;">AI Showroom</h2>
            <p style="color:white;font-weight:bold;">Upload body photo (capturing from head to toe)</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%;padding:15px;background:#e60023;color:white;border-radius:10px;border:none;">Upload Photo</button>
        </div>`;
};

window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.addToCart = () => { cart.push(selectedCloth); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.closeFittingRoom(); };
async function getBase64FromUrl(url) { return new Promise(res => { fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.blob()).then(b => { const rd = new FileReader(); rd.onloadend = () => res(rd.result.split(',')[1]); rd.readAsDataURL(b); }); }); }
async function resizeImage(b) { return new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); const M = 1024; let w = i.width, h = i.height; if (w > h) { h *= M/w; w = M; } else { w *= M/h; h = M; } c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(i, 0, 0, w, h); r(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; i.src = b; }); }
window.handleCustomerUpload = (e) => { const reader = new FileReader(); reader.onload = async (ev) => { tempCustomerPhoto = await resizeImage(ev.target.result); window.startTryOn(); }; reader.readAsDataURL(e.target.files[0]); };