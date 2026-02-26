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
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 

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
            
            // --- DYNAMIC SEARCH HINT UPDATE ---
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search Senator or Ankara";
            }
            // ----------------------------------

            if (data.profileImage) {
                const ownerImg = document.getElementById('owner-img');
                if(ownerImg) { ownerImg.src = data.profileImage; ownerImg.style.display = 'block'; }
            }
            if (data.phone) storePhone = data.phone;
            
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled === true) {
                if (greetingEl) greetingEl.style.display = 'block';
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Chief, looking for premium native?"];
            } else {
                window.activeGreetings = []; 
                if (greetingEl) { greetingEl.style.display = 'none'; greetingEl.innerText = ''; }
            }

            setTimeout(() => {
                const qsArray = (data.quickSearches && data.quickSearches.length > 0) ? data.quickSearches : ["Native Wear", "Jeans"];
                const container = document.getElementById('quick-search-container');
                if (container) {
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

function saveCart() {
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI();
}

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    tempCustomerPhoto = ""; 
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resultDiv = document.getElementById('ai-fitting-result');
    resultDiv.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="font-weight:800; color:#e60023;">AI Showroom</h2>
            <p>Try on <strong>${selectedCloth.name}</strong>.</p>
            <input type="file" id="temp-tryon-input" hidden accept="image/*" onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">Upload Photo</button>
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
        const rawClothData = await getBase64FromUrl(selectedCloth.imgUrl);
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
                    <button id="add-to-cart-dynamic" onclick="window.addToCart()" style="width:100%; padding:18px; background:var(--accent); color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">Add to Cart 🛍️</button>
                    <div id="proceed-btn-container" style="${cart.length > 0 ? 'display:block' : 'display:none'}">
                        <button onclick="window.openCart()" style="width:100%; padding:15px; background:transparent; color:var(--text-main); border:1px solid var(--border); border-radius:12px; font-weight:bold; cursor:pointer;">Proceed to Cart <i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>`;
        } else { throw new Error(result.error); }
    } catch (e) { alert("Error: " + e.message); window.closeFittingRoom(); }
};

window.addToCart = () => {
    const btn = document.getElementById('add-to-cart-dynamic');
    if (btn && btn.innerText.includes("Add to Cart")) {
        cart.push(selectedCloth);
        saveCart();
        showToast(`✅ Added!`);
        btn.innerText = "Check another one";
        btn.style.background = "#eee"; btn.style.color = "#333";
        document.getElementById('proceed-btn-container').style.display = 'block';
    } else { window.closeFittingRoom(); }
};

window.openCart = () => {
    window.closeFittingRoom();
    const modal = document.getElementById('fitting-room-modal');
    const resultDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    if (cart.length === 0) { resultDiv.innerHTML = `<div style="padding:40px; text-align:center;"><h3>Empty Cart</h3></div>`; return; }
    
    let total = cart.reduce((sum, item) => sum + item.price, 0);
    let itemsHTML = cart.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">
            <div style="text-align:left;"><p style="margin:0; font-weight:bold;">${item.name}</p><p style="margin:0; color:var(--accent);">₦${item.price.toLocaleString()}</p></div>
            <button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>`).join('');
        
    resultDiv.innerHTML = `<div style="padding:10px;"><h2>YOUR CART</h2><div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><div style="display:flex; justify-content:space-between; font-weight:800; margin:20px 0; border-top: 2px solid var(--accent); padding-top:15px;"><span>Total:</span> <span>₦${total.toLocaleString()}</span></div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:18px; background:#25D366; color:white; border-radius:12px; border:none; font-weight:bold; cursor:pointer;"><i class="fab fa-whatsapp"></i> Checkout via WhatsApp</button></div>`;
};

window.removeFromCart = (idx) => { cart.splice(idx, 1); saveCart(); window.openCart(); };

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ 1x ${i.name} - ₦${i.price.toLocaleString()}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    window.open(`https://wa.me/${storePhone}?text=Hello%20${currentStoreId},%20I%20want%20to%20pay%20for:%0A${list}%0A%0A*GRAND%20TOTAL:%20₦${total.toLocaleString()}*`);
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
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-NG';
    micBtn.addEventListener('click', () => { micBtn.style.color = "#e60023"; recognition.start(); });
    recognition.onresult = (e) => { 
        document.getElementById('ai-input').value = e.results[0][0].transcript; 
        micBtn.style.color = "#5f6368"; 
        window.executeSearch(); 
    };
    recognition.onend = () => { micBtn.style.color = "#5f6368"; };
}

async function resizeImage(base64Str) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_SIDE = 1024; let w = img.width, h = img.height; if (w > h) { if (w > MAX_SIDE) { h *= MAX_SIDE / w; w = MAX_SIDE; } } else { if (h > MAX_SIDE) { w *= MAX_SIDE / h; h = MAX_SIDE; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]); }; img.src = base64Str; }); }

async function getBase64FromUrl(url) { 
    return new Promise((resolve, reject) => {
        const freshParam = 'vmall_' + Math.random().toString(36).substring(7);
        const freshUrl = url + (url.includes('?') ? '&' : '?') + 'fresh=' + freshParam;
        const tryFetch = async (proxyBase) => {
            const r = await fetch(`${proxyBase}${encodeURIComponent(freshUrl)}`);
            if (!r.ok) throw new Error();
            const b = await r.blob();
            return new Promise((res) => {
                const rd = new FileReader();
                rd.onloadend = () => res(rd.result.split(',')[1]);
                rd.readAsDataURL(b);
            });
        };
        tryFetch(`https://api.allorigins.win/raw?url=`).then(resolve).catch(() => {
            tryFetch(`https://api.codetabs.com/v1/proxy?quest=`).then(resolve).catch(() => {
                const img = new Image(); img.crossOrigin = "anonymous";
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width; canvas.height = img.height;
                    const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL("image/jpeg").split(',')[1]);
                };
                img.onerror = () => reject(new Error("Security Blocked. Refresh page."));
                img.src = freshUrl;
            });
        });
    });
}

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }