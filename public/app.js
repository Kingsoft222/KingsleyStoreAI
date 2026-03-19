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
    getDownloadURL, 
    getBlob
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

let localUserBase64 = "";
window.activeGreetings = []; 
let gIndex = 0;
let vtoRetryCount = 0;

const geminiApiKey = ""; 

// --- Chatway Integration ---
(function() {
    const s = document.createElement("script");
    s.id = "chatway";
    s.async = true;
    s.src = "https://cdn.chatway.app/widget.js?id=govCX46EKb8v";
    document.head.appendChild(s);
})();

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    
    // Unified Menu Button Logic
    const findAndEnableMenu = () => {
        const elements = document.querySelectorAll('button, div, span, i, svg');
        const menuBtn = Array.from(elements).find(el => {
            const rect = el.getBoundingClientRect();
            const isTopLeft = rect.top < 100 && rect.left < 100 && rect.width > 0;
            const hasIconContent = el.innerText.includes('☰') || el.innerHTML.includes('svg') || el.innerHTML.includes('line') || el.classList.contains('fa-bars');
            return isTopLeft && hasIconContent;
        });

        if (menuBtn && !menuBtn.getAttribute('data-menu-active')) {
            menuBtn.setAttribute('data-menu-active', 'true');
            menuBtn.style.cursor = 'pointer';
            const openAction = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.openOptionsMenu();
            };
            menuBtn.onclick = openAction;
            menuBtn.addEventListener('touchstart', openAction, { passive: false });
        }
    };

    findAndEnableMenu();
    setInterval(findAndEnableMenu, 3000);

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search Senator or Ankara...";
                // Smart Hide Logic
                searchInput.onfocus = () => { if (window.chatway && window.chatway.hide) window.chatway.hide(); };
                searchInput.onblur = () => { if (window.chatway && window.chatway.show) window.chatway.show(); };
            }
            
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
    }, 4000);

    initVoiceSearch();
});

function initGlobalUIStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Permanent removal of previous dummy chat elements */
        #draggable-chat-head, #chat-close-zone, [id*="dummy-chat"], .custom-support-icon { display: none !important; }
        
        /* Interactive Search Card Fix */
        .result-card { 
            background: #ffffff !important; 
            border-radius: 12px; 
            padding: 10px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
            cursor: pointer !important; 
            pointer-events: auto !important; 
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
            z-index: 10;
        }
        .result-card:hover { transform: translateY(-2px); }
        .result-card img { pointer-events: none; border-radius: 8px; width: 100%; object-fit: cover; }

        /* Sidebar Layout and Categorization */
        #sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 20000; display: none; }
        #sidebar-drawer { position: fixed; top: 0; left: -320px; width: 300px; height: 100%; background: white; z-index: 20001; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 4px 0 15px rgba(0,0,0,0.15); display: flex; flex-direction: column; }
        #sidebar-drawer.open { left: 0; }
        .sidebar-item { display: flex; align-items: center; gap: 16px; padding: 14px 24px; cursor: pointer; transition: 0.2s; color: #1f1f1f; text-decoration: none; }
        .sidebar-item:hover { background: #f8f9fa; }
        .sidebar-active { background: #e9eef6; border-radius: 0 30px 30px 0; margin-right: 12px; color: #0b57d0 !important; font-weight: 600; }
        .sidebar-category { padding: 20px 24px 8px; font-size: 0.75rem; font-weight: 700; color: #5f6368; text-transform: uppercase; letter-spacing: 0.8px; }

        .circular-loader { border: 4px solid rgba(230, 0, 35, 0.1); border-top: 4px solid #e60023; border-radius: 50%; width: 45px; height: 45px; animation: spin-loader 0.8s linear infinite; }
        @keyframes spin-loader { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
}

window.openOptionsMenu = () => {
    const modal = document.getElementById('fitting-room-modal');
    if (!modal) return;
    modal.style.display = 'block'; modal.style.background = 'transparent';
    const resDiv = document.getElementById('ai-fitting-result');
    const agentIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zm-4 11v6H6v-6h2zm10 6h-2v-6h2v6zm-6 2c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm7.5-5.8c-.3 0-.5.2-.5.5v1.3c0 1.1-.9 2-2 2h-1c-.3 0-.5.2-.5.5s.2.5.5.5h1c1.7 0 3-1.3 3-3V13.7c0-.3-.2-.5-.5-.5z"/></svg>`;

    resDiv.innerHTML = `
        <div id="sidebar-overlay" style="display: block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background: #fff; font-family: 'Google Sans', sans-serif; overflow-y: auto;">
                <div style="padding: 28px 24px 12px; font-size: 1.4rem; font-weight: 700; color: #1f1f1f; display: flex; align-items: center; justify-content: space-between;">
                    <span><span style="color:#e60023;">S</span>tore Options</span>
                    <span style="font-size: 1.2rem; cursor: pointer; color: #5f6368;" onclick="window.closeFittingRoom()">✕</span>
                </div>
                <div style="display: flex; flex-direction: column; margin-top: 10px;">
                    <div onclick="window.openChatSupport()" class="sidebar-item sidebar-active">
                        <span style="color: #0b57d0; display: flex; align-items: center;">${agentIcon}</span>
                        <span style="flex: 1;">Chat Support</span>
                    </div>
                    <div style="padding: 30px 24px 10px; font-size: 0.9rem; font-weight: 600; color: #1f1f1f; display: flex; align-items: center; gap: 8px; border-top: 1px solid #f1f1f1; margin-top: 15px;">Verified store <span style="color: #0b57d0;">✔️</span></div>
                    <div class="sidebar-category">Luxury Wears</div>
                    <a href="?store=kingss1" class="sidebar-item">💎<span>Stella Wears</span></a>
                    <a href="?store=ifeomaezema1791" class="sidebar-item">👗<span>IFY FASHION</span></a>
                    <div class="sidebar-category">Bespoke Native</div>
                    <a href="?store=adivichi" class="sidebar-item">🧵<span>ADIVICHI FASHION</span></a>
                    <a href="?store=thomasmongim" class="sidebar-item">👔<span>TOMMY BEST FASHION</span></a>
                </div>
                <div style="flex: 1;"></div>
                <div style="padding: 24px; border-top: 1px solid #f1f1f1; text-align: center; opacity: 0.4;"><p style="font-size: 0.65rem; font-weight: 800; letter-spacing: 2px;">VIRTUAL MALL AI</p></div>
            </div>
        </div>`;
};

window.openChatSupport = () => {
    if (window.chatway) { 
        window.chatway.show(); 
        if (window.chatway.open) window.chatway.open(); 
        window.closeFittingRoom(); 
    }
};

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adaptiveTextColor = isDarkMode ? 'white' : 'black';
    const styleId = 'dynamic-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; document.head.appendChild(styleTag); }
    styleTag.innerHTML = `
        #dynamic-greeting, #store-name-display, .summary-text, .theme-subtext, .theme-p { color: ${adaptiveTextColor} !important; }
        #ai-input { color: ${adaptiveTextColor}; background: ${isDarkMode ? '#222' : '#f9f9f9'}; }
        .zoom-container { position: relative; overflow: hidden; width: 100%; height: 60vh; border-radius: 15px; background: #000; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: zoom-in; }
        .zoom-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; transform-origin: center; pointer-events: none; }
        .zoomed { transform: scale(2.8); cursor: zoom-out; }
        .close-preview-x { position: absolute; top: 15px; right: 15px; width: 40px; height: 40px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; z-index: 10005; border: 2px solid rgba(255,255,255,0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .modal-close-btn, .close-modal, .modal-header .close, .modal-content > .close, #fitting-room-modal > span:first-child, .close-btn { display: none !important; }
    `;
}

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    if (!micBtn) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e) {} };
    recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; micBtn.style.color = "#5f6368"; window.executeSearch(); };
}

window.closeFittingRoom = () => { 
    vtoRetryCount = 0; tempUserImageUrl = ""; localUserBase64 = ""; 
    const modal = document.getElementById('fitting-room-modal'); 
    if (modal) { modal.style.display = 'none'; modal.style.background = 'rgba(0,0,0,0.8)'; }
    if (window.chatway) window.chatway.show();
};

window.promptShowroomChoice = (id) => {
    if (window.chatway) window.chatway.hide();
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    if (!selectedCloth) return;
    tempUserImageUrl = ""; localUserBase64 = ""; vtoRetryCount = 0;
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:5px; position:relative;">
            <div class="zoom-container" id="preview-zoom-box"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <div style="padding:15px 10px;">
                <h3 class="summary-text" style="margin-bottom:2px; font-weight:800;">${selectedCloth.name}</h3>
                <p style="color:#e60023; font-weight:800; font-size:1.4rem; margin-bottom:10px;">₦${selectedCloth.price.toLocaleString()}</p>
                <p style="color:#888; font-size:0.7rem; margin-bottom:15px;">Tap to zoom & move to inspect</p>
                <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; cursor:pointer; border:none; font-size:1.2rem; text-transform:uppercase; letter-spacing:1px; box-shadow: 0 8px 20px rgba(230,0,35,0.3);">Wear it! ✨</button>
            </div>
        </div>`;
    
    const container = document.getElementById('preview-zoom-box'), img = document.getElementById('preview-img');
    const handlePan = (e) => {
        if (!img.classList.contains('zoomed')) return;
        const rect = container.getBoundingClientRect();
        const clientX = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const x = ((clientX - rect.left) / rect.width) * 100, y = ((clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${Math.min(Math.max(x, 0), 100)}% ${Math.min(Math.max(y, 0), 100)}%`;
    };
    container.onclick = (e) => { if (e.target.classList.contains('close-preview-x')) return; img.classList.toggle('zoomed'); if (img.classList.contains('zoomed')) handlePan(e); };
    container.onmousemove = handlePan; container.ontouchmove = handlePan;
    applyDynamicThemeStyles();
};

window.proceedToUpload = () => {
    vtoRetryCount = 0; const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px; position:relative;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:5px;">FINISH YOUR LOOK</h2>
            <p class="theme-subtext" style="font-weight:600; margin-bottom:25px; line-height:1.4;">Upload a clear full-body photo</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button id="vto-upload-btn" onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; cursor:pointer; border:none; font-size:1.1rem;">SELECT FROM GALLERY</button>
        </div>`;
    applyDynamicThemeStyles();
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { 
        const base64 = await resizeImage(ev.target.result); localUserBase64 = base64.split(',')[1]; window.startTryOn(); 
        const fileName = `vto_temp/${Date.now()}.jpg`; const storageRef = sRef(storage, fileName); uploadString(storageRef, base64, 'data_url');
    }; reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    if (!localUserBase64 || !selectedCloth) return;
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="position:relative; text-align:center; padding:60px 20px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px; width:100%;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="circular-loader"></div><p style="margin-top:25px; font-weight:800; color:#e60023; text-transform:uppercase; letter-spacing:1px;">Stitching your outfit...</p></div>`;
    try {
        const clothUrl = selectedCloth.imgUrl;
        let clothBase64;
        if (clothUrl.includes('firebasestorage.googleapis.com')) {
            const decodedUrl = decodeURIComponent(clothUrl.split('/o/')[1].split('?')[0]);
            const blob = await getBlob(sRef(storage, decodedUrl));
            clothBase64 = await new Promise((res) => { const r = new FileReader(); r.onloadend = () => res(r.result.split(',')[1]); r.readAsDataURL(blob); });
        } else {
            const resp = await fetch(clothUrl, { mode: 'cors' });
            const blob = await resp.blob();
            clothBase64 = await new Promise((res) => { const r = new FileReader(); r.onloadend = () => res(r.result.split(',')[1]); r.readAsDataURL(blob); });
        }
        const payload = { contents: [{ parts: [{ text: "High-Fidelity Virtual Try-On Task" }, { inlineData: { mimeType: "image/jpeg", data: localUserBase64 } }, { inlineData: { mimeType: "image/jpeg", data: clothBase64 } }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey || firebaseConfig.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const resultData = await response.json();
        const generatedBase64 = resultData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (generatedBase64) {
            vtoRetryCount = 0; const imgSrc = `data:image/jpeg;base64,${generatedBase64}`;
            resDiv.innerHTML = `<div style="position:relative; text-align:center; padding:10px;"><div class="zoom-container" style="height:auto; min-height:40vh; background:transparent;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="${imgSrc}" style="width:100%; border-radius:15px; box-shadow: 0 15px 40px rgba(0,0,0,0.6);"></div><div style="display:flex; gap:12px; margin-top:20px;"><button onclick="window.addToCart()" style="flex:2; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:1.1rem;">Add to Cart 🛍️</button><button onclick="window.closeFittingRoom()" style="flex:1; padding:20px; background:#333; color:white; border-radius:14px; font-weight:bold; border:none; cursor:pointer;">Discard</button></div></div>`;
        } else { throw new Error("AI_NO_IMAGE"); }
    } catch (e) { 
        if (vtoRetryCount < 3) { vtoRetryCount++; setTimeout(() => window.startTryOn(), 3000); } 
        else { resDiv.innerHTML = `<div style="position:relative; text-align:center; padding:40px 20px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><p style="color:white; font-weight:700;">AI Tailor is Busy</p><button onclick="window.startTryOn()" style="background:#e60023; color:white; border:none; padding:15px; margin-top:20px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer;">RETRY NOW</button></div>`; }
    }
};

window.addToCart = () => {
    if(!selectedCloth) return; cart.push(selectedCloth); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); 
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="position:relative; text-align:center; padding:60px 20px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:white; margin-bottom:25px; font-weight:900;">IN YOUR BAG!</h2><button onclick="window.openCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer; margin-bottom:12px; font-size:1.1rem;">CHECKOUT NOW</button></div>`;
};

window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + (i.price || 0), 0);
    try {
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { whatsappClicks: increment(1), totalRevenue: increment(total), lastSaleID: orderId });
        await set(dbRef(db, `receipts/${orderId}`), { storeId: currentStoreId, items: cart, total: total, date: new Date().toLocaleString(), verifiedHost: window.location.hostname });
        window.location.assign(`https://wa.me/${storePhone.replace('+', '')}?text=🛡️ *ORDER* ID: *${orderId}*`);
        cart = []; localStorage.removeItem(`cart_${currentStoreId}`); updateCartUI();
    } catch(e) { console.error(e); }
};

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) { resDiv.innerHTML = `<div style="position:relative; padding:60px 20px; text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h3 class="summary-text">Your cart is empty</h3></div>`; return; }
    let itemsHTML = cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;"><div style="text-align:left;"><p class="cart-item-name" style="margin:0; font-weight:bold;">${item.name}</p><p style="margin:0; color:#e60023;">₦${item.price.toLocaleString()}</p></div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button></div>`).join('');
    resDiv.innerHTML = `<div style="position:relative; padding:20px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#e60023; font-weight:800;">YOUR BAG</h2><div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer; font-size:1.1rem;">CHECKOUT ON WHATSAPP</button></div>`;
    applyDynamicThemeStyles();
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query) || (c.tags && c.tags.toLowerCase().includes(query)));
    results.style.display = 'grid';
    // Mapping interactive click cards
    results.innerHTML = filtered.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}">
            <h4 class="cart-item-name" style="color:#000 !important;">${item.name}</h4>
            <p style="color:#e60023 !important; font-weight:bold;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

async function resizeImage(b64) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 800; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } else { if (h > MAX) { w *= MAX/h; h = MAX; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.80)); }; img.src = b64; }); }
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };