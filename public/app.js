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
const db = getDatabase(app, "https://kingsleystoreai-default-rtdb.firebaseio.com");

const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let tempCustomerPhoto = ""; 
let selectedCloth = null;
let cart = []; 
let storePhone = "2348000000000"; 
let storeCatalog = []; 

const globalCatalog = [
    { id: 1, vendor: "kingsley", name: "Premium Red Luxury Native", tags: "native senator red ankara", img: "senator_red.jpg", price: 25000, cat: "Native" },
    { id: 2, vendor: "kingsley", name: "Classic White Polo", tags: "polo white corporate", img: "white_polo.jpg", price: 10000, cat: "Corporate" },
    { id: 3, vendor: "emeka", name: "Emeka's Baggy Jeans", tags: "jeans denim baggy trousers casual", img: "baggy_jeans.jpg", price: 28000, cat: "Casual" }
];

window.activeGreetings = [
    "Nne, what are you looking for today?", 
    "My guy, what are you looking for today?", 
    "Classic Man, what are you looking for today?", 
    "Chief, looking for premium native?", 
    "Boss, let's find your style!", 
    "Classic Babe, what are you looking for today?", 
    "Baddie, let's find your style!"
];
let gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const storeRef = ref(db, `stores/${currentStoreId}`);
    onValue(storeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || currentStoreId.toUpperCase() + " STORE";
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            if (data.phone) storePhone = data.phone;
            
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled === false) {
                greetingEl.style.display = 'none';
            } else {
                greetingEl.style.display = 'block';
                if (data.customGreetings && data.customGreetings.length > 0) {
                    window.activeGreetings = data.customGreetings;
                }
            }

            if (data.catalog) {
                storeCatalog = Object.keys(data.catalog).map(key => {
                    return {
                        id: key, 
                        name: data.catalog[key].name,
                        price: data.catalog[key].price,
                        tags: data.catalog[key].tags,
                        cat: data.catalog[key].cat,
                        imgUrl: data.catalog[key].imgUrl 
                    };
                });
            } else {
                storeCatalog = globalCatalog.filter(c => c.vendor === currentStoreId);
            }

        } else {
            document.getElementById('store-name-display').innerText = currentStoreId.toUpperCase() + " STORE";
            storeCatalog = globalCatalog.filter(c => c.vendor === currentStoreId);
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && el.style.display !== 'none') { 
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
            <p style="color:var(--text-main); margin-bottom:20px;">Upload a fresh photo to try on <strong>${selectedCloth.name}</strong>.</p>
            <input type="file" id="temp-tryon-input" hidden accept="image/*" onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">
                <i class="fas fa-camera"></i> Upload Photo
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
        const imageSource = selectedCloth.imgUrl ? selectedCloth.imgUrl : `images/${selectedCloth.img}`;
        const rawClothData = await getBase64FromUrl(imageSource);
        
        const clothB64 = await resizeImage(rawClothData);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: tempCustomerPhoto, clothImage: clothB64, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="width:100%; text-align:right; margin-bottom:10px;"><span onclick="window.closeFittingRoom()" style="color:#e60023; font-weight:bold; cursor:pointer;">✕ Try Another Look</span></div>
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px; border:1px solid #e60023;">
                <div style="margin-top:15px; display:flex; flex-direction:column; gap:10px;">
                    <button onclick="window.addToCart()" style="width:100%; padding:18px; background:var(--accent); color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">Add to Cart 🛍️</button>
                    <div id="proceed-btn-container" style="${cart.length > 0 ? 'display:block' : 'display:none'}">
                        <button onclick="window.openCart()" style="width:100%; padding:15px; background:transparent; color:var(--text-main); border:1px solid var(--border); border-radius:12px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer;">
                            Proceed to Cart <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>`;
        } else { 
            throw new Error(result.error || "AI Engine failed to process image."); 
        }
    } catch (e) { 
        console.error("VTO Error:", e);
        alert("System Error: " + e.message + "\n\n(If it says Failed to Fetch, it is a network error. Try again.)"); 
        window.closeFittingRoom(); 
    }
};

window.addToCart = () => {
    cart.push(selectedCloth);
    updateCartUI();
    showToast(`${selectedCloth.name} added!`);
    const p = document.getElementById('proceed-btn-container'); if(p) p.style.display = 'block';
};

window.openCart = () => {
    window.closeFittingRoom();
    const modal = document.getElementById('fitting-room-modal');
    const resultDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    if (cart.length === 0) { resultDiv.innerHTML = `<div style="padding:40px; text-align:center;"><h3 style="color:var(--accent);">Empty Cart</h3></div>`; return; }
    
    let total = cart.reduce((sum, item) => sum + item.price, 0);
    let itemsHTML = cart.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
            <div style="text-align:left;"><p style="margin:0; font-weight:bold; color:var(--text-main);">${item.name}</p><p style="margin:0; color:var(--accent);">₦${item.price.toLocaleString()}</p></div>
            <button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
        </div>`).join('');
        
    resultDiv.innerHTML = `<div style="padding:10px;"><h2 style="color:var(--accent); font-weight:800;">YOUR CART</h2><div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><div style="display:flex; justify-content:space-between; font-weight:800; margin:20px 0; border-top: 2px solid var(--accent); padding-top:15px;"><span>Total:</span> <span>₦${total.toLocaleString()}</span></div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:18px; background:#25D366; color:white; border-radius:12px; font-weight:bold; cursor:pointer;"><i class="fab fa-whatsapp"></i> Checkout via WhatsApp</button></div>`;
};

window.removeFromCart = (idx) => { cart.splice(idx, 1); updateCartUI(); window.openCart(); };

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `- ${i.name}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    window.open(`https://wa.me/${storePhone}?text=Hello%20${currentStoreId},%20I%20want%20to%20pay%20for:%0A${list}%0A%0ATotal:%20₦${total.toLocaleString()}`);
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query) || c.tags.toLowerCase().includes(query) || c.cat.toLowerCase().includes(query));
    results.style.display = 'grid';
    
    if (filtered.length > 0) {
        results.innerHTML = filtered.map(item => {
            const imageSource = item.imgUrl ? item.imgUrl : `images/${item.img}`;
            return `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${imageSource}"><h4 style="margin:8px 0; color:white;">${item.name}</h4><p style="color:#e60023; font-weight:bold;">₦${item.price.toLocaleString()}</p></div>`;
        }).join('');
    } else {
        results.style.display = 'block';
        results.innerHTML = `<p style="text-align:center; padding:20px;">No items found in this store for "${query}".</p>`;
    }
};

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const searchInput = document.getElementById('ai-input');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    micBtn.addEventListener('click', () => { micBtn.style.color = "#e60023"; recognition.start(); });
    recognition.onresult = (e) => { searchInput.value = e.results[0][0].transcript; micBtn.style.color = "#5f6368"; window.executeSearch(); };
}

async function resizeImage(base64Str) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_SIDE = 1024; let w = img.width, h = img.height; if (w > h) { if (w > MAX_SIDE) { h *= MAX_SIDE / w; w = MAX_SIDE; } } else { if (h > MAX_SIDE) { w *= MAX_SIDE / h; h = MAX_SIDE; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]); }; img.src = base64Str; }); }

// --- THE CRITICAL CORS BYPASS FIX ---
async function getBase64FromUrl(url) { 
    // 1. If it's a local mock image, fetch normally
    if (!url.startsWith('http')) {
        const r = await fetch(url); 
        const b = await r.blob(); 
        return new Promise((res) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result); rd.readAsDataURL(b); }); 
    }

    // 2. If it's a Firebase image, use the double-proxy system to bypass CORS
    try {
        let r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        
        // If the first proxy fails, fallback to the second proxy
        if (!r.ok) {
            r = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
        }
        
        if (!r.ok) throw new Error("Image security block could not be bypassed.");
        
        const b = await r.blob(); 
        return new Promise((res) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result); rd.readAsDataURL(b); }); 
    } catch (err) {
        throw new Error("Security Block or Network Failure: " + err.message);
    }
}

window.closeFittingRoom = () => { 
    tempCustomerPhoto = ""; 
    document.getElementById('fitting-room-modal').style.display = 'none'; 
};
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 500); }, 2500); }