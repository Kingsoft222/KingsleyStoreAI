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
    const sendBtn = document.getElementById('send-btn');
    if(sendBtn) sendBtn.onclick = () => window.executeSearch();
});

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDarkMode ? 'white' : 'black';
    const subtextColor = isDarkMode ? '#ccc' : '#444';

    const styleId = 'dynamic-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        #dynamic-greeting, #store-name-display, .result-card h4, .cart-item-name, .summary-text, .theme-subtext, .theme-p { color: ${textColor} !important; }
        #ai-input { color: ${textColor}; background: ${isDarkMode ? '#222' : '#f9f9f9'}; }
        .checkout-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; color: white; }
    `;
    
    // Add Overlay Element if missing
    if(!document.getElementById('checkout-loader')) {
        const loader = document.createElement('div');
        loader.id = 'checkout-loader';
        loader.className = 'checkout-overlay';
        loader.innerHTML = `
            <div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            <p style="margin-top:20px; font-weight:800; color:#e60023; letter-spacing:1px;">SECURING YOUR ORDER...</p>
            <p style="font-size:0.7rem; color:#888;">Generating Official Receipt</p>
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
    
    micBtn.onclick = () => { 
        micBtn.style.color = "#e60023"; 
        recognition.start(); 
    };
    
    recognition.onresult = (e) => { 
        const transcript = e.results[0][0].transcript;
        document.getElementById('ai-input').value = transcript; 
        micBtn.style.color = "#5f6368"; 
        window.executeSearch(); 
    };
    recognition.onend = () => { micBtn.style.color = "#5f6368"; };
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

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div class="loader-container"><div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div><p style="margin-top:20px; font-weight:800; color:#e60023;">STITCHING YOUR OUTFIT...</p></div>`;
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
        } else { alert("Failed."); window.closeFittingRoom(); }
    } catch (e) { alert("Error."); window.closeFittingRoom(); }
};

// --- COMPLETE TRANSACTION PROCESS (FOUNDER ACCOUNTABILITY + OVERLAY) ---

window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    
    const loader = document.getElementById('checkout-loader');
    if(loader) loader.style.display = 'flex';

    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + i.price, 0);
    const orderDate = new Date().toLocaleString();

    try {
        // 1. GLOBAL TRACKING
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { 
            whatsappClicks: increment(1),
            totalRevenue: increment(total),
            lastSaleID: orderId
        });

        // 2. DATA LOCK
        await set(dbRef(db, `receipts/${orderId}`), {
            storeId: currentStoreId,
            items: cart,
            total: total,
            date: orderDate,
            verifiedHost: window.location.hostname
        });

        // 3. SECURE REDIRECT
        const receiptLink = `${window.location.origin}/receipt.html?id=${orderId}`;
        const summaryMsg = `🛡️ *VERIFIED VIRTUALMALL ORDER*%0A` +
                           `Order ID: *${orderId}*%0A` +
                           `Total: *₦${total.toLocaleString()}*%0A%0A` +
                           `✅ *View Official Secure Receipt:*%0A` +
                           `${receiptLink}%0A%0A` +
                           `⚠️ *Vendor Note:* Verify link hostname matches VirtualMall.`;

        const waUrl = `https://wa.me/${storePhone.replace('+', '')}?text=${summaryMsg}`;
        
        cart = []; 
        localStorage.removeItem(`cart_${currentStoreId}`); 
        updateCartUI();
        window.location.assign(waUrl);

    } catch(e) { 
        if(loader) loader.style.display = 'none';
        alert("Security Handshake Failed. Check your internet.");
    }
};

window.addToCart = () => {
    if(!selectedCloth) return;
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI(); 
    showToast("✅ Added successfully"); 
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:#25D366;">✅ Added to Cart</h2><button onclick="window.openCart()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; border:none; cursor:pointer;">Proceed to Cart <i class="fas fa-arrow-right"></i></button></div>`;
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
    results.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4 class="cart-item-name" style="margin:5px 0;">${item.name}</h4><p style="color:#e60023; font-weight:bold;">₦${item.price.toLocaleString()}</p></div>`).join('');
};

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
async function getBase64FromUrl(url) { return new Promise((resolve) => { fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.blob()).then(b => { const rd = new FileReader(); rd.onloadend = () => resolve(rd.result.split(',')[1]); rd.readAsDataURL(b); }); }); }
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };