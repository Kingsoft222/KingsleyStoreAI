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

// --- Chatway Dynamic Page Injection (Locked) ---
const injectChatSupport = () => {
    if (document.getElementById('chatway-script')) return;
    const s = document.createElement("script");
    s.id = "chatway-script";
    s.async = true;
    s.src = "https://cdn.chatway.app/widget.js?id=govCX46EKb8v";
    document.head.appendChild(s);
};

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    
    // Greeting state restoration
    const greetingEl = document.getElementById('dynamic-greeting');
    if (greetingEl) greetingEl.innerText = "Loading greetings...";

    const findAndEnableMenu = () => {
        const elements = document.querySelectorAll('button, div, span, i, svg');
        const menuBtn = Array.from(elements).find(el => {
            const rect = el.getBoundingClientRect();
            const isTopLeft = rect.top < 120 && rect.left < 100 && rect.width > 0;
            const hasIconContent = el.innerText.includes('☰') || el.innerHTML.includes('svg') || el.innerHTML.includes('line') || el.classList.contains('fa-bars');
            return isTopLeft && hasIconContent;
        });

        if (menuBtn && !menuBtn.getAttribute('data-menu-active')) {
            menuBtn.setAttribute('data-menu-active', 'true');
            menuBtn.classList.add('fixed-sidebar-icon');
            menuBtn.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
        }
    };

    findAndEnableMenu();
    setInterval(findAndEnableMenu, 3000);

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const rawStoreName = data.storeName || "STORE";
            document.getElementById('store-name-display').innerText = rawStoreName;
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search Senator or Ankara...";
                searchInput.oninput = window.executeSearch;
            }

            // Restore Store Front Ads
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
            
            if (data.greetingsEnabled !== false) {
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Welcome!"];
                if (greetingEl) {
                    greetingEl.innerText = window.activeGreetings[0];
                    greetingEl.style.display = 'block';
                }
            } else if (greetingEl) {
                greetingEl.style.display = 'none';
            }

            if (data.catalog) {
                storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
                window.renderProducts(storeCatalog);
            }
            updateCartUI();
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && window.activeGreetings.length > 1) { 
            gIndex = (gIndex + 1) % window.activeGreetings.length;
            el.innerText = window.activeGreetings[gIndex]; 
        }
    }, 4000);

    initVoiceSearch();
});

window.renderProducts = (items) => {
    const listContainer = document.getElementById('product-list') || document.getElementById('main-catalog');
    if (!listContainer) return;
    listContainer.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; pointer-events:all !important;">
            <img src="${item.imgUrl}" alt="${item.name}" style="pointer-events:none;">
            <h4 class="cart-item-name" style="color:#000 !important; font-weight:700; font-size:0.9rem;">${item.name}</h4>
            <p style="color:#e60023 !important; font-weight:800; font-size:1.1rem;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

function initGlobalUIStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        #draggable-chat-head, #chat-close-zone, [id*="dummy-chat"] { display: none !important; }
        
        /* FIXED VENDOR HEADER: High-priority layering so products scroll UNDER */
        #owner-img, #store-name-display, #dynamic-greeting, .fixed-sidebar-icon {
            position: relative;
            z-index: 20000 !important;
        }

        /* Cart Icon: Fixed Top Right corner */
        [id*="cart-icon"], .cart-container, #cart-count-parent {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 20001 !important;
        }
        
        .fixed-sidebar-icon {
            position: fixed !important;
            top: 25px !important;
            left: 20px !important;
        }

        /* PROFESSIONAL TUCKING & SCROLLING */
        #ai-results {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            padding: 10px !important;
            width: 100% !important;
            max-height: 58vh !important; 
            overflow-y: auto !important;
            position: absolute !important;
            bottom: 85px !important;
            left: 0 !important;
            z-index: 15000 !important;
            background: #fff;
            box-shadow: 0 -10px 25px rgba(0,0,0,0.05);
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            -webkit-overflow-scrolling: touch;
        }

        #product-list, #main-catalog {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            padding: 10px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin-top: 130px; /* Spacer for fixed vendor header */
        }

        .result-card { 
            background: #ffffff !important; 
            border-radius: 14px; 
            padding: 10px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.08); 
            cursor: pointer !important; 
            pointer-events: auto !important; 
            transition: transform 0.2s ease; 
        }

        /* UNIFIED SINGLE PROFESSIONAL MODAL */
        #fitting-room-modal {
            display: none; position: fixed; top: 0; left: 0;
            width: 100%; height: 100%; background: rgba(0,0,0,0.85);
            z-index: 30000; align-items: center; justify-content: center;
        }

        .modal-body-content {
            background: #fff;
            width: 90%;
            max-width: 380px; 
            border-radius: 28px;
            overflow: hidden;
            position: relative;
            padding: 25px 15px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.4);
            animation: modalPop 0.3s ease;
            text-align: center;
        }

        @keyframes modalPop { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        /* Centered Dotted Spinner */
        .dotted-spinner {
            width: 50px; height: 50px;
            border: 5px dotted #e60023;
            border-radius: 50%;
            animation: spin-dotted 2s linear infinite;
            margin: 15px auto;
        }
        @keyframes spin-dotted { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .zoom-container { position: relative; overflow: hidden; width: 100%; height: 48vh; border-radius: 15px; background: #000; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: zoom-in; }
        .zoom-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; transform-origin: center; pointer-events: none; }
        .zoomed { transform: scale(2.8); cursor: zoom-out; }
        .close-preview-x { position: absolute; top: 12px; right: 12px; width: 38px; height: 38px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; z-index: 40000; border: 1.5px solid rgba(255,255,255,0.3); }

        #sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 20000; display: none; }
        #sidebar-drawer { position: fixed; top: 0; left: -320px; width: 300px; height: 100%; background: white; z-index: 20001; transition: left 0.3s ease; display: flex; flex-direction: column; overflow-y: auto; }
        #sidebar-drawer.open { left: 0; }
        .sidebar-item { display: flex; align-items: center; gap: 16px; padding: 14px 24px; cursor: pointer; color: #1f1f1f; text-decoration: none; font-weight: 600; font-family: 'Google Sans', sans-serif; }
    `;
    document.head.appendChild(style);
}

window.openOptionsMenu = () => {
    const modal = document.getElementById('fitting-room-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    const agentIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zm-4 11v6H6v-6h2zm10 6h-2v-6h2v6zm-6 2c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm7.5-5.8c-.3 0-.5.2-.5.5v1.3c0 1.1-.9 2-2 2h-1c-.3 0-.5.2-.5.5s.2.5.5.5h1c1.7 0 3-1.3 3-3V13.7c0-.3-.2-.5-.5-.5z"/></svg>`;
    
    resDiv.innerHTML = `
        <div id="sidebar-overlay" style="display: block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background: #fff;">
                <div style="padding: 28px 24px 12px; font-size: 1.4rem; font-weight: 700; color: #1f1f1f; display: flex; align-items: center; justify-content: space-between;">
                    <span>Store Options</span>
                    <span style="font-size: 1.2rem; cursor: pointer; color: #5f6368;" onclick="window.closeFittingRoom()">✕</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <div onclick="window.openChatPage()" class="sidebar-item"><span style="color: #0b57d0;">${agentIcon}</span><span>Chat Support</span></div>
                    <div class="sidebar-category">Luxury Wears</div>
                    <div onclick="window.location.assign('?store=kingss1')" class="sidebar-item">💎<span>Stella Wears</span></div>
                    <div onclick="window.location.assign('?store=ifeomaezema1791')" class="sidebar-item">👗<span>IFY FASHION</span></div>
                    <div class="sidebar-category">Bespoke Native</div>
                    <div onclick="window.location.assign('?store=adivichi')" class="sidebar-item">🧵<span>ADIVICHI FASHION</span></div>
                    <div onclick="window.location.assign('?store=thomasmongim')" class="sidebar-item">👔<span>TOMMY BEST FASHION</span></div>
                </div>
            </div>
        </div>`;
};

window.openChatPage = () => {
    injectChatSupport();
    const modal = document.getElementById('fitting-room-modal');
    const resDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    resDiv.innerHTML = `
        <div class="modal-body-content" style="max-width: 480px; padding: 50px 20px;">
            <div onclick="window.closeFittingRoom()" style="position: absolute; top: 15px; right: 20px; z-index: 40000; color: #ccc; font-size: 1.5rem; cursor: pointer;">✕</div>
            <div class="dotted-spinner" style="margin-bottom: 25px;"></div>
            <h2 style="font-weight: 900; color: #111; font-size: 1.7rem; letter-spacing: -1px; margin-bottom: 5px;">SUPPORT CENTER</h2>
            <p style="color: #666; font-weight: 500; font-size: 0.95rem; line-height: 1.5; max-width: 290px; margin: 0 auto 30px;">The official chat agent for this store is loading below. Please wait...</p>
            <button onclick="window.closeFittingRoom()" style="background: #111; border: none; padding: 18px 45px; border-radius: 40px; font-weight: 800; color: #fff; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; font-size: 0.75rem;">Return to Mall</button>
        </div>`;
    if (window.chatway) { window.chatway.show(); window.chatway.open(); }
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query) || (c.tags && c.tags.toLowerCase().includes(query)));
    results.style.display = 'grid';
    results.innerHTML = filtered.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; pointer-events:all !important;">
            <img src="${item.imgUrl}">
            <h4 class="cart-item-name" style="color:#000 !important; font-weight:700; margin-top:8px; font-size:0.8rem;">${item.name}</h4>
            <p style="color:#e60023 !important; font-weight:800; font-size:1rem;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

window.promptShowroomChoice = (id) => {
    if (window.chatway) window.chatway.hide();
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    if (!selectedCloth) return;
    
    const fullStoreName = document.getElementById('store-name-display').innerText;
    const vendorName = fullStoreName.split(' ')[0] || "Vendor";
    const personalizedTitle = `${vendorName}'s Showroom`;

    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div class="modal-body-content">
            <h2 style="font-weight:900; font-size:1.1rem; color:#e60023; margin:0 0 15px; text-transform:capitalize;"><b>${personalizedTitle}</b></h2>
            <div class="zoom-container" id="preview-zoom-box"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <div style="padding:15px 5px 0;">
                <h3 class="summary-text" style="margin-bottom:2px; font-weight:800; font-size:0.95rem;">${selectedCloth.name}</h3>
                <p style="color:#e60023; font-weight:800; font-size:1.1rem; margin-bottom:12px;">₦${selectedCloth.price.toLocaleString()}</p>
                <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:12px; font-weight:900; border:none; cursor:pointer; font-size:1rem; text-transform:uppercase;">Wear it! ✨</button>
            </div>
        </div>`;
    
    const container = document.getElementById('preview-zoom-box'), img = document.getElementById('preview-img');
    const handlePan = (e) => {
        if (!img.classList.contains('zoomed')) return;
        const rect = container.getBoundingClientRect();
        const clientX = (e.clientX !== undefined) ? e.clientX : (e.touches[0].clientX);
        const clientY = (e.clientY !== undefined) ? e.clientY : (e.touches[0].clientY);
        const x = ((clientX - rect.left) / rect.width) * 100, y = ((clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${x}% ${y}%`;
    };
    container.onclick = (e) => { if (e.target.classList.contains('close-preview-x')) return; img.classList.toggle('zoomed'); };
    container.onmousemove = handlePan; container.ontouchmove = handlePan;
};

window.proceedToUpload = () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div class="modal-body-content" style="padding:40px 20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:3.5rem; margin-bottom:10px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:20px; font-size:1.3rem;">FINISH YOUR LOOK</h2>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:0.9rem; text-transform:uppercase;">SELECT FROM GALLERY</button>
        </div>`;
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = async (ev) => { localUserBase64 = ev.target.result.split(',')[1]; window.startTryOn(); }; reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const fullStoreName = document.getElementById('store-name-display').innerText;
    const vendorName = fullStoreName.split(' ')[0] || "Vendor";
    
    resDiv.innerHTML = `
        <div class="modal-body-content" style="padding:45px 20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="font-weight:900; font-size:1.2rem; margin-bottom:5px; color:#e60023; margin-top:-5px;"><b>${vendorName}'s Showroom</b></h2>
            <h3 style="font-weight:800; font-size:0.95rem; color:#111; margin-bottom:20px; letter-spacing:1px;">STITCHING YOUR OUTFIT</h3>
            <div class="dotted-spinner"></div>
            <p style="margin-top:20px; font-weight:700; color:#e60023; font-size:0.75rem; text-transform:uppercase;">PREPARING YOUR AI PREVIEW...</p>
        </div>`;
};

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adaptiveTextColor = isDarkMode ? 'white' : 'black';
    const styleId = 'dynamic-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; document.head.appendChild(styleTag); }
    styleTag.innerHTML = `#dynamic-greeting, #store-name-display, .summary-text { color: ${adaptiveTextColor} !important; } #ai-input { color: ${adaptiveTextColor}; background: ${isDarkMode ? '#222' : '#f9f9f9'}; }`;
}

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn'); if (!micBtn) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRec) return;
    const recognition = new SpeechRec(); recognition.lang = 'en-NG';
    micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e) {} };
    recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); };
}

window.closeFittingRoom = () => { 
    const modal = document.getElementById('fitting-room-modal'); 
    if (modal) modal.style.display = 'none'; 
    if (window.chatway) { window.chatway.close(); window.chatway.hide(); } 
};

async function resizeImage(b64) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 800; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } else { if (h > MAX) { w *= MAX/h; h = MAX; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.80)); }; img.src = b64; }); }
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); };