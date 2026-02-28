import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref as dbRef, 
    get, 
    set, 
    update, 
    push, 
    remove, 
    increment, 
    onValue 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

window.activeGreetings = []; 
let gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search Senator or Ankara...";
            }

            // --- RENDER DEDICATED CATEGORY LABELS AS BLACK CARDS ABOVE SEARCH BAR ---
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label1 || 'Ladies Trouser'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Shop exclusive wear</p>
                    </div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label2 || 'Dinner Wears'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Perfect styles for you</p>
                    </div>`;
            }

            if (data.profileImage) { document.getElementById('owner-img').src = data.profileImage; }
            
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            
            // --- GREETINGS TOGGLE FIX ---
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled !== false) {
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) 
                    ? data.customGreetings 
                    : ["Welcome, Chief!", "Looking for premium style?", "Quality materials only."];
                if (greetingEl) {
                    greetingEl.innerText = window.activeGreetings[0];
                    greetingEl.style.display = 'block';
                }
            } else if (greetingEl) {
                greetingEl.style.display = 'none';
                window.activeGreetings = [];
            }

            if (data.catalog) {
                storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
            }
            updateCartUI();
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && window.activeGreetings.length > 0) { 
            el.innerText = window.activeGreetings[gIndex % window.activeGreetings.length]; 
            gIndex++; 
        }
    }, 3000);

    initVoiceSearch();
});

// --- RESTORED SHOWROOM MODAL MESSAGES ---
window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <h2 style="color:#e60023; font-weight:800; margin-bottom:5px;">AI SHOWROOM</h2>
            <p style="color:white; font-weight:600; margin-bottom:20px;">Upload a full picture showing your head to toe</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer; border:none;">Select from Gallery</button>
        </div>`;
};

window.addToCart = () => {
    if(!selectedCloth) return;
    cart.push(selectedCloth); // Correctly pushes to the cart array
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI(); 
    showToast("✅ Added successfully"); 

    const resDiv = document.getElementById('ai-fitting-result');
    const existingBtn = resDiv.querySelector('button');
    
    if (existingBtn) {
        existingBtn.innerText = "Check another one";
        existingBtn.onclick = () => window.closeFittingRoom();
        existingBtn.style.background = "#555"; 
        
        if (!document.getElementById('proceed-to-cart-btn')) {
            const proceedBtn = document.createElement('button');
            proceedBtn.id = 'proceed-to-cart-btn';
            proceedBtn.innerHTML = 'Proceed to cart <i class="fas fa-arrow-right"></i>';
            proceedBtn.style.cssText = "width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; margin-top:10px; border:none; cursor:pointer;";
            
            proceedBtn.onclick = async () => {
                // 1. Log Sales Intent to Master Vault (using currentStoreId)
                try {
                    await update(dbRef(db, `stores/${currentStoreId}/analytics`), {
                        whatsappClicks: increment(1)
                    });
                } catch (e) { console.error("Tracking error", e); }

                // 2. Open cart UI directly
                window.openCart();
            };
            
            resDiv.appendChild(proceedBtn);
        }
    }
};

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ 1x ${i.name}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);

    // CART CLEARING UPON WHATSAPP TAP
    const waUrl = `https://wa.me/${storePhone.replace('+', '')}?text=Order:%0A${list}%0A%0ATOTAL: ₦${total.toLocaleString()}`;
    
    // Clear cart memory and storage
    cart = [];
    localStorage.removeItem(`cart_${currentStoreId}`);
    updateCartUI();
    
    window.open(waUrl, '_blank');
    window.closeFittingRoom();
};

// --- RESTORED LOADER MESSAGE ---
window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div class="loader-container"><div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><p style="color:white; margin-top:20px; font-weight:800;">STITCHING YOUR OUTFIT...</p></div>`;
    try {
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: tempCustomerPhoto, clothImage: rawCloth, category: selectedCloth.cat || "top_body" }) 
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px;">
                <button onclick="window.addToCart()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; margin-top:15px; border:none; cursor:pointer;">Add to Cart 🛍️</button>`;
        } else {
            alert("AI processing failed. Please try a clearer body photo.");
            window.closeFittingRoom();
        }
    } catch (e) { alert("Network error. Please check your connection."); window.closeFittingRoom(); }
};

// --- OPTIMIZED IMAGE RESIZING FOR SPEED ---
async function resizeImage(b64) { 
    return new Promise((res) => { 
        const img = new Image(); 
        img.onload = () => { 
            const canvas = document.createElement('canvas'); 
            const MAX = 800; // Reduced for faster processing speed
            let w = img.width, h = img.height; 
            if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } 
            else { if (h > MAX) { w *= MAX/h; h = MAX; } } 
            canvas.width = w; canvas.height = h; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, w, h); 
            res(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]); 
        }; 
        img.src = b64; 
    }); 
}

// ... Rest of utility functions remain as provided ...

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) {
        resDiv.innerHTML = `<div style="padding:40px; text-align:center;"><h3 style="color:white;">Your cart is empty</h3></div>`;
        return;
    }
    
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px; color:white;">
            <div style="text-align:left;">
                <p style="margin:0; font-weight:bold;">${item.name}</p>
                <p style="margin:0; color:#e60023;">₦${item.price.toLocaleString()}</p>
            </div>
            <button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>`).join('');

    resDiv.innerHTML = `
        <div style="padding:10px; color:white;">
            <h2 style="color:#e60023; font-weight:800;">YOUR CART</h2>
            <div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div>
            <div style="display:flex; justify-content:space-between; font-weight:800; margin-bottom:20px; border-top: 2px solid #e60023; padding-top:15px;">
                <span>Total:</span> <span>₦${total.toLocaleString()}</span>
            </div>
            <button onclick="window.checkoutWhatsApp()" style="width:100%; padding:18px; background:#25D366; color:white; border-radius:12px; border:none; font-weight:bold; cursor:pointer;">
                <i class="fab fa-whatsapp"></i> Checkout via WhatsApp
            </button>
        </div>`;
};

window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI();
    window.openCart();
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query) || (c.tags && c.tags.toLowerCase().includes(query)));
    results.style.display = 'grid';
    results.innerHTML = filtered.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}">
            <h4 style="color:white; margin:5px 0;">${item.name}</h4>
            <p style="color:#e60023; font-weight:bold;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    
    micBtn.addEventListener('click', () => { 
        micBtn.style.color = "#e60023"; 
        recognition.start(); 
    });
    
    recognition.onresult = (e) => { 
        document.getElementById('ai-input').value = e.results[0][0].transcript; 
        micBtn.style.color = "#5f6368"; 
        window.executeSearch(); 
    };
    recognition.onend = () => { micBtn.style.color = "#5f6368"; };
}

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { 
        tempCustomerPhoto = await resizeImage(ev.target.result); 
        window.startTryOn(); 
    }; 
    reader.readAsDataURL(file); 
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
async function getBase64FromUrl(url) { return new Promise((resolve) => { fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.blob()).then(b => { const rd = new FileReader(); rd.onloadend = () => resolve(rd.result.split(',')[1]); rd.readAsDataURL(b); }); }); }
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };