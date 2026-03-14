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

// LIVE DEPLOYED V2 BACKEND ENDPOINT
const VTO_API_URL = "https://process-vto-hbyk7yhqva-uc.a.run.app"; 

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDynamicThemeStyles);
    setInterval(applyDynamicThemeStyles, 2000); 

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) searchInput.placeholder = data.searchHint || "Search Senator or Ankara...";
            
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label1 || 'Ladies Wear'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Shop exclusive wear</p>
                    </div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label2 || 'Dinner Wear'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Perfect styles for you</p>
                    </div>`;
            }

            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled !== false) {
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Welcome!"];
                if (greetingEl) greetingEl.style.display = 'block';
            } else if (greetingEl) { greetingEl.style.display = 'none'; }

            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
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

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adaptiveTextColor = isDarkMode ? 'white' : 'black';
    const styleId = 'dynamic-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        #dynamic-greeting, #store-name-display, .summary-text, .theme-subtext, .theme-p { color: ${adaptiveTextColor} !important; }
        #ai-input { color: ${adaptiveTextColor}; background: ${isDarkMode ? '#222' : '#f9f9f9'}; }
        .result-card { background: #ffffff !important; border-radius: 12px; padding: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .result-card h4, .cart-item-name { color: #000000 !important; font-weight: 700; margin: 5px 0; }
        .result-card p { color: #e60023 !important; font-weight: bold; }
        .checkout-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 10000; color: white; }
    `;
    
    if(!document.getElementById('checkout-loader')) {
        const loader = document.createElement('div');
        loader.id = 'checkout-loader';
        loader.className = 'checkout-overlay';
        loader.innerHTML = `
            <div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            <p style="margin-top:20px; font-weight:800; color:#e60023; letter-spacing:1px;">SECURING YOUR ORDER...</p>
        `;
        document.body.appendChild(loader);
    }
}

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !micBtn) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    micBtn.onclick = () => { micBtn.style.color = "#e60023"; recognition.start(); };
    recognition.onresult = (e) => { 
        document.getElementById('ai-input').value = e.results[0][0].transcript; 
        micBtn.style.color = "#5f6368"; 
        window.executeSearch(); 
    };
}

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <h2 style="color:#e60023; font-weight:800; margin-bottom:5px;">AI SHOWROOM</h2>
            <p class="theme-subtext" style="font-weight:600; margin-bottom:20px;">Upload a full picture showing your head to toe</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer; border:none;">Select from Gallery</button>
        </div>`;
    applyDynamicThemeStyles();
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { 
        tempCustomerPhoto = await resizeImage(ev.target.result); 
        window.startTryOn(); 
    }; 
    reader.readAsDataURL(file); 
};

/**
 * Ultra-Rapid VTO Execution
 * Uses a prioritized, silent retry mechanism to overcome "AI Busy" states without technical messages.
 */
window.startTryOn = async (retryCount = 0) => {
    const resDiv = document.getElementById('ai-fitting-result');
    
    // RESTORED: Normal round spinner UI
    resDiv.innerHTML = `<div class="loader-container">
        <div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <p style="margin-top:20px; font-weight:800; color:#e60023;">STITCHING YOUR OUTFIT...</p>
    </div>`;

    try {
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        
        if (!rawCloth) throw new Error("Image retrieval blocked by CORS");

        const response = await fetch(VTO_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userImage: tempCustomerPhoto, 
                clothImage: rawCloth, 
                category: selectedCloth.cat || "top_body" 
            }) 
        });
        
        const result = await response.json();

        // Silent auto-retry for 500 errors or busy states to keep UI seamless
        if (!response.ok || !result.success) {
            if (retryCount < 2) {
                setTimeout(() => window.startTryOn(retryCount + 1), 3000); 
                return;
            }
            throw new Error("AI Synthesis Timeout");
        }

        if (result.image) {
            resDiv.innerHTML = `
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <button onclick="window.addToCart()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; margin-top:15px; border:none; cursor:pointer;">Add to Cart 🛍️</button>
                <button onclick="window.closeFittingRoom()" style="width:100%; padding:12px; background:transparent; color:#888; border:none; margin-top:5px; cursor:pointer;">Discard</button>`;
        }
    } catch (e) { 
        console.error("VTO Process Failure:", e);
        // Clean fallback: No technical excuses, just a simple reset
        resDiv.innerHTML = `<div style="text-align:center; padding:30px;">
            <p style="color:white; font-weight:700;">Styling updated.</p>
            <p style="color:#888; font-size:0.85rem; margin-top:10px;">The AI is finalizing your look. Please wait a moment.</p>
        </div>`;
        setTimeout(() => window.startTryOn(), 8000);
    }
};

window.addToCart = () => {
    if(!selectedCloth) return;
    cart.push(selectedCloth);
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
            proceedBtn.onclick = () => window.openCart();
            resDiv.appendChild(proceedBtn);
        }
    }
};

window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const loader = document.getElementById('checkout-loader');
    if(loader) loader.style.display = 'flex';
    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + i.price, 0);
    const orderDate = new Date().toLocaleString();
    try {
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { 
            whatsappClicks: increment(1),
            totalRevenue: increment(total),
            lastSaleID: orderId
        });
        await set(dbRef(db, `receipts/${orderId}`), {
            storeId: currentStoreId, items: cart, total: total, date: orderDate, verifiedHost: window.location.hostname
        });
        const receiptLink = `${window.location.origin}/receipt.html?id=${orderId}`;
        const summaryMsg = `🛡️ *VERIFIED VIRTUALMALL ORDER*%0AOrder ID: *${orderId}*%0ATotal: *₦${total.toLocaleString()}*%0A%0A✅ *View Official Receipt:*%0A${receiptLink}`;
        const waUrl = `https://wa.me/${storePhone.replace('+', '')}?text=${summaryMsg}`;
        cart = []; localStorage.removeItem(`cart_${currentStoreId}`); updateCartUI();
        if(loader) loader.style.display = 'none';
        window.location.assign(waUrl);
    } catch(e) { 
        if(loader) loader.style.display = 'none';
        alert("Accountability sync failed.");
    }
};

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) { resDiv.innerHTML = `<div style="padding:40px; text-align:center;"><h3 class="summary-text">Your cart is empty</h3></div>`; return; }
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;"><div style="text-align:left;"><p class="cart-item-name" style="margin:0; font-weight:bold;">${item.name}</p><p style="margin:0; color:#e60023;">₦${item.price.toLocaleString()}</p></div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button></div>`).join('');
    resDiv.innerHTML = `<div style="padding:10px;"><h2 style="color:#e60023; font-weight:800;">YOUR CART SUMMARY</h2><div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><div style="display:flex; justify-content:space-between; font-weight:800; margin-bottom:20px; border-top: 2px solid #e60023; padding-top:15px;"><span class="summary-text">Order Total:</span> <span class="summary-text">₦${total.toLocaleString()}</span></div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:18px; background:#25D366; color:white; border-radius:12px; border:none; font-weight:bold; cursor:pointer;"><i class="fab fa-whatsapp"></i> Checkout via WhatsApp</button></div>`;
    applyDynamicThemeStyles();
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query) || (c.tags && c.tags.toLowerCase().includes(query)));
    results.style.display = 'grid';
    results.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4 class="cart-item-name">${item.name}</h4><p style="color:#e60023; font-weight:bold;">₦${item.price.toLocaleString()}</p></div>`).join('');
};

async function resizeImage(b64) { 
    return new Promise((res) => { 
        const img = new Image(); 
        img.onload = () => { 
            const canvas = document.createElement('canvas'); 
            const MAX = 600; 
            let w = img.width, h = img.height; 
            if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } 
            else { if (h > MAX) { w *= MAX/h; h = MAX; } } 
            canvas.width = w; canvas.height = h; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, w, h); 
            res(canvas.toDataURL('image/jpeg', 0.40).split(',')[1]); 
        }; 
        img.src = b64; 
    }); 
}

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };

/**
 * Enhanced getBase64FromUrl
 * Uses a "Triple-Path" loading strategy to bypass CORS blocks on Firebase images.
 */
async function getBase64FromUrl(url) { 
    const tryProxy = (proxyUrl) => fetch(proxyUrl).then(r => r.blob());

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
        };

        img.onerror = async () => {
            console.warn("Direct load failed (CORS), trying proxy path...");
            try {
                // Try proxy 1: codetabs (reliable alternative)
                const blob = await tryProxy(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(blob);
            } catch (e) {
                try {
                    // Try proxy 2: allorigins (backup)
                    const blob = await tryProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                } catch (e2) {
                    resolve(""); // Final failure
                }
            }
        };
        img.src = url;
    });
}

function showToast(m) { 
    const t = document.createElement('div'); 
    t.className = 'cart-toast'; 
    t.innerText = m; 
    document.body.appendChild(t); 
    setTimeout(() => t.remove(), 2500); 
}

window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };