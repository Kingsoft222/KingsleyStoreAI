import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref as dbRef, 
    onValue,
    update,
    set,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getStorage, 
    ref as sRef, 
    uploadString, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    getAuth, 
    signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const storage = getStorage(app);
const auth = getAuth(app);
const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let tempUserImageUrl = "", selectedCloth = null, storePhone = "2348000000000", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 

window.activeGreetings = []; 
let gIndex = 0;
let vtoRetryCount = 0;

const VTO_API_URL = "https://process-vto-hbyk7yhqva-uc.a.run.app"; 

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 

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
        .zoom-container { position: relative; overflow: hidden; width: 100%; height: 65vh; border-radius: 15px; background: #000; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: zoom-in; }
        .zoom-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; transform-origin: center; pointer-events: none; }
        .zoomed { transform: scale(2.8); cursor: zoom-out; }
        .close-preview-x { position: absolute; top: 15px; right: 15px; width: 40px; height: 40px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; z-index: 10005; border: 2px solid rgba(255,255,255,0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        /* Global override to ensure modal edge close buttons from underlying HTML or shell are hidden */
        .modal-close-btn, .close-modal, .modal-header .close, #fitting-room-modal > .close-preview-x { display: none !important; }
    `;
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

window.closeFittingRoom = () => {
    vtoRetryCount = 0;
    tempUserImageUrl = "";
    document.getElementById('fitting-room-modal').style.display = 'none';
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    tempUserImageUrl = ""; 
    vtoRetryCount = 0;
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    
    // UI Update: 'X' is anchored strictly inside the content container (zoom-container)
    resDiv.innerHTML = `
        <div style="text-align:center; padding:5px;">
            <div class="zoom-container" id="preview-zoom-box">
                <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                <img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img">
            </div>
            <div style="padding:15px 10px;">
                <h3 class="summary-text" style="margin-bottom:2px; font-weight:800;">${selectedCloth.name}</h3>
                <p style="color:#e60023; font-weight:800; font-size:1.4rem; margin-bottom:15px;">₦${selectedCloth.price.toLocaleString()}</p>
                <p style="color:#888; font-size:0.75rem; margin-bottom:15px;">Tap to zoom & move to pan</p>
                <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; cursor:pointer; border:none; font-size:1.2rem; text-transform:uppercase; letter-spacing:1px; box-shadow: 0 8px 20px rgba(230,0,35,0.3);">Wear it! ✨</button>
            </div>
        </div>`;
    
    const container = document.getElementById('preview-zoom-box');
    const img = document.getElementById('preview-img');

    const handlePan = (e) => {
        if (!img.classList.contains('zoomed')) return;
        const rect = container.getBoundingClientRect();
        const clientX = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${Math.min(Math.max(x, 0), 100)}% ${Math.min(Math.max(y, 0), 100)}%`;
    };

    container.onclick = (e) => {
        if (e.target.classList.contains('close-preview-x')) return; 
        img.classList.toggle('zoomed');
        container.style.cursor = img.classList.contains('zoomed') ? 'zoom-out' : 'zoom-in';
        if (img.classList.contains('zoomed')) handlePan(e);
    };

    container.onmousemove = handlePan;
    container.ontouchmove = handlePan;
    applyDynamicThemeStyles();
};

window.proceedToUpload = () => {
    vtoRetryCount = 0; 
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <div style="background:#000; border-radius:15px; padding:40px 10px; position:relative;">
                <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
                <h2 style="color:#e60023; font-weight:900; margin-bottom:5px;">FINISH YOUR LOOK</h2>
                <p class="theme-subtext" style="font-weight:600; margin-bottom:25px; line-height:1.4;">Upload a clear full-body photo<br><span style="font-weight:400; font-size:0.8rem; color:#888;">(Head to toe for best results)</span></p>
                <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
                <button id="vto-upload-btn" onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; cursor:pointer; border:none; font-size:1.1rem;">SELECT FROM GALLERY</button>
            </div>
            <button onclick="window.promptShowroomChoice('${selectedCloth.id}')" style="background:transparent; color:#888; border:none; padding:12px; margin-top:20px; width:100%; font-weight:bold;">Go Back</button>
        </div>`;
    applyDynamicThemeStyles();
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const btn = document.getElementById('vto-upload-btn');
    if(btn) { btn.innerText = "PREPARING PHOTO..."; btn.disabled = true; }

    const reader = new FileReader(); 
    reader.onload = async (ev) => { 
        const base64 = await resizeImage(ev.target.result);
        const fileName = `vto_temp/${Date.now()}.jpg`;
        const storageRef = sRef(storage, fileName);
        
        try {
            await uploadString(storageRef, base64, 'data_url');
            tempUserImageUrl = await getDownloadURL(storageRef);
            vtoRetryCount = 0;
            window.startTryOn(); 
        } catch (err) {
            console.error("Upload failed", err);
            if(btn) { btn.innerText = "RETRY SELECTING PHOTO"; btn.disabled = false; }
        }
    }; 
    reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    if (!tempUserImageUrl) return;
    const resDiv = document.getElementById('ai-fitting-result');
    
    resDiv.innerHTML = `<div class="loader-container" style="padding:40px 0; text-align:center;">
        <div style="background:#000; border-radius:15px; padding:60px 10px; position:relative;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div class="rotating-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            <p style="margin-top:25px; font-weight:800; color:#e60023; letter-spacing:1px; text-transform:uppercase;">Stitching your outfit...</p>
        </div>
    </div>`;

    try {
        const response = await fetch(VTO_API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                jobId: `vto_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                userImageUrl: tempUserImageUrl, 
                clothImageUrl: selectedCloth.imgUrl,
                category: (selectedCloth.cat === "top_body" ? "upper_body" : selectedCloth.cat) || "upper_body" 
            }) 
        });
        
        if (!response.ok) {
            const status = response.status;
            if (status === 404) {
                displayVTOError("System Sync Required (404)", "The backend is using an outdated AI model ID. Update your Cloud Run code to use 'gemini-3-pro-image-preview' for specialized fashion stitching.");
                return; 
            }
            throw new Error(`HTTP ${status}`);
        }
        
        const result = await response.json();

        if (result.success && (result.image || result.imageUrl)) {
            vtoRetryCount = 0;
            const imgSrc = result.image ? `data:image/jpeg;base64,${result.image}` : result.imageUrl;
            resDiv.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <div class="zoom-container" style="height:auto; min-height:40vh; background:transparent;">
                        <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                        <img src="${imgSrc}" style="width:100%; border-radius:15px; box-shadow: 0 15px 40px rgba(0,0,0,0.6);">
                    </div>
                    <div style="display:flex; gap:12px; margin-top:20px;">
                        <button onclick="window.addToCart()" style="flex:2; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:1.1rem;">Add to Cart 🛍️</button>
                        <button onclick="window.closeFittingRoom()" style="flex:1; padding:20px; background:#333; color:white; border-radius:14px; font-weight:bold; border:none; cursor:pointer;">Discard</button>
                    </div>
                </div>`;
        } else {
            throw new Error("FAIL");
        }
    } catch (e) { 
        if (vtoRetryCount < 2) {
            vtoRetryCount++;
            setTimeout(() => window.startTryOn(), 4000);
        } else {
            displayVTOError("AI Tailor is Busy", "The server is recovering from heavy load. Please try again shortly.");
        }
    }
};

function displayVTOError(title, msg) {
    const resDiv = document.getElementById('ai-fitting-result');
    if (!resDiv) return;
    resDiv.innerHTML = `
        <div style="text-align:center; padding:30px;">
            <div style="background:#000; border-radius:15px; padding:40px 10px; position:relative;">
                <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                <p style="color:white; font-weight:700;">${title}</p>
                <p style="color:#888; font-size:0.85rem; margin-top:10px;">${msg}</p>
                <button onclick="window.startTryOn()" style="background:#e60023; color:white; border:none; padding:15px; margin-top:20px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer;">RETRY NOW</button>
            </div>
            <button onclick="window.proceedToUpload()" style="background:transparent; color:#e60023; border:none; padding:12px; margin-top:10px; width:100%; font-weight:bold; cursor:pointer;">Try another photo</button>
        </div>`;
}

window.addToCart = () => {
    if(!selectedCloth) return;
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI(); 
    showToast("✅ Added successfully"); 

    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div style="background:#000; border-radius:15px; padding:40px 10px; position:relative;">
                <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                <div style="font-size:4rem; margin-bottom:20px;">🛍️</div>
                <h2 style="color:white; margin-bottom:25px; font-weight:900;">IN YOUR BAG!</h2>
                <button onclick="window.openCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer; margin-bottom:12px; font-size:1.1rem;">CHECKOUT NOW</button>
                <button onclick="window.closeFittingRoom()" style="width:100%; padding:20px; background:#333; color:white; border-radius:14px; font-weight:bold; border:none; cursor:pointer;">KEEP SHOPPING</button>
            </div>
        </div>`;
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
    if (cart.length === 0) { resDiv.innerHTML = `<div style="padding:40px; text-align:center;"><div style="background:#000; border-radius:15px; padding:40px 10px; position:relative;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h3 class="summary-text">Your cart is empty</h3></div></div>`; return; }
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;"><div style="text-align:left;"><p class="cart-item-name" style="margin:0; font-weight:bold;">${item.name}</p><p style="margin:0; color:#e60023;">₦${item.price.toLocaleString()}</p></div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button></div>`).join('');
    resDiv.innerHTML = `<div style="padding:10px;"><div style="background:#000; border-radius:15px; padding:20px; position:relative;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#e60023; font-weight:800;">YOUR CART SUMMARY</h2><div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><div style="display:flex; justify-content:space-between; font-weight:800; margin-bottom:20px; border-top: 2px solid #e60023; padding-top:15px;"><span class="summary-text">Order Total:</span> <span class="summary-text">₦${total.toLocaleString()}</span></div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer; font-size:1.1rem;"><i class="fab fa-whatsapp"></i> CHECKOUT ON WHATSAPP</button></div></div>`;
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
            const MAX = 800; 
            let w = img.width, h = img.height; 
            if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } 
            else { if (h > MAX) { w *= MAX/h; h = MAX; } } 
            canvas.width = w; canvas.height = h; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, w, h); 
            res(canvas.toDataURL('image/jpeg', 0.80)); 
        }; 
        img.src = b64; 
    }); 
}

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };

function showToast(m) { 
    const t = document.createElement('div'); 
    t.className = 'cart-toast'; 
    t.innerText = m; 
    document.body.appendChild(t); 
    setTimeout(() => t.remove(), 2500); 
}

window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };