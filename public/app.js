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

let tempCustomerPhoto = "", selectedCloth = null, cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 
let storePhone = "2348000000000", storeCatalog = [], windowActiveGreetings = [], gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const storeRef = ref(db, `stores/${currentStoreId}`);
    onValue(storeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || currentStoreId.toUpperCase() + " STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) searchInput.placeholder = data.searchHint || "Search Senator or Ankara";
            if (data.profileImage) { const img = document.getElementById('owner-img'); if(img) img.src = data.profileImage; }
            if (data.phone) storePhone = data.phone;
            
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled) {
                greetingEl.style.display = 'block';
                windowActiveGreetings = data.customGreetings || ["Welcome!"];
            } else { greetingEl.style.display = 'none'; windowActiveGreetings = []; }

            setTimeout(() => {
                const qsArray = data.quickSearches || ["Native Wear"];
                const container = document.getElementById('quick-search-container');
                if (container) container.innerHTML = qsArray.map(tag => `<div class="search-card" onclick="window.quickSearch('${tag}')"><strong>${tag}</strong></div>`).join('');
            }, 150);

            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && windowActiveGreetings.length > 0) { el.innerText = windowActiveGreetings[gIndex % windowActiveGreetings.length]; gIndex++; }
    }, 2500);

    initVoiceSearch();
    updateCartUI();
});

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="font-weight:800; color:#e60023;">AI Showroom</h2>
            <p>Try on <strong>${selectedCloth.name}</strong>.</p>
            <p style="color: #e60023; font-weight: bold; font-size: 0.9rem; margin-bottom: 15px;">
                📸 IMPORTANT: Upload a FULL body photo (capturing from head to toes) for a perfect fit!
            </p>
            <input type="file" id="temp-tryon-input" hidden accept="image/*" onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border:none; border-radius:12px; font-weight:bold;">Upload Head-to-Toe Photo</button>
        </div>`;
};

window.handleCustomerUpload = (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => { tempCustomerPhoto = await resizeImage(event.target.result); window.startTryOn(); };
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
};

window.startTryOn = async () => {
    const resultDiv = document.getElementById('ai-fitting-result');
    resultDiv.innerHTML = `<div class="loader-container"><div class="rotating-dots"><div class="dot"></div></div><p>STITCHING YOUR LOOK Head-to-Toe...</p></div>`;
    try {
        const rawClothData = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: tempCustomerPhoto, clothImage: rawClothData, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        if (result.success) {
            resultDiv.innerHTML = `<img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px; margin-top:20px;">
                <button onclick="window.addToCart()" style="width:100%; padding:18px; background:var(--accent); color:white; border:none; border-radius:12px; font-weight:bold; margin-top:10px;">Add to Cart 🛍️</button>`;
        } else { alert("Try again with a clearer head-to-toe photo!"); window.closeFittingRoom(); }
    } catch (e) { alert("Error connecting. Refresh."); window.closeFittingRoom(); }
};

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ 1x ${i.name} - ₦${i.price.toLocaleString()}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    window.open(`https://wa.me/${storePhone}?text=Hello%20${currentStoreId},%20I%20want%20to%20pay%20for:%0A${list}%0A%0A*TOTAL:%20₦${total.toLocaleString()}*`);
};

window.addToCart = () => { cart.push(selectedCloth); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); showToast("Added!"); window.closeFittingRoom(); };
window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase().trim();
    const res = document.getElementById('ai-results');
    if (!q) { res.style.display='none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q));
    res.style.display = 'grid';
    res.innerHTML = filtered.map(i => `<div class="result-card" onclick="window.promptShowroomChoice('${i.id}')"><img src="${i.imgUrl}"><h4>${i.name}</h4><p>₦${i.price.toLocaleString()}</p></div>`).join('');
};

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    micBtn.addEventListener('click', () => { recognition.start(); });
    recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); };
}

async function resizeImage(b64) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 1024; let w = img.width, h = img.height; if (w > h) { h *= MAX/w; w = MAX; } else { w *= MAX/h; h = MAX; } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]); }; img.src = b64; }); }

async function getBase64FromUrl(url) { 
    return new Promise((resolve) => {
        fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
            .then(r => r.blob()).then(b => {
                const rd = new FileReader(); rd.onloadend = () => resolve(rd.result.split(',')[1]); rd.readAsDataURL(b);
            });
    });
}

window.closeFittingRoom = () => document.getElementById('fitting-room-modal').style.display = 'none';
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if(c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function showToast(m) { const t = document.getElementById('status-toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }