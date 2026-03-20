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

async function optimizeForAI(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 768;
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
    });
}

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
    
    const greetingEl = document.getElementById('dynamic-greeting');
    if (greetingEl) greetingEl.innerText = "Loading greetings...";

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
                if (greetingEl) { greetingEl.innerText = window.activeGreetings[0]; greetingEl.style.display = 'block'; }
            } else if (greetingEl) { greetingEl.style.display = 'none'; }
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
        .result-card:active { transform: scale(0.96); }
        .result-card img { pointer-events: none; border-radius: 10px; width: 100%; aspect-ratio: 1/1; object-fit: cover; }
        .dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin-dotted 2s linear infinite; margin: 0 auto; }
        @keyframes spin-dotted { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .zoom-container { position: relative; overflow: hidden; width: 100%; height: 65vh; border-radius: 18px; background: #000; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: zoom-in; z-index: 21000; }
        .zoom-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; transform-origin: center; pointer-events: none; }
        .zoomed { transform: scale(2.8); cursor: zoom-out; }
        .close-preview-x { position: absolute; top: 15px; right: 15px; width: 44px; height: 44px; background: rgba(0,0,0,0.85); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; z-index: 22000; border: 2px solid rgba(255,255,255,0.4); }
        .sidebar-item { display: flex; align-items: center; gap: 16px; padding: 14px 24px; cursor: pointer; color: #1f1f1f; text-decoration: none; font-family: 'Google Sans', sans-serif; font-weight: 600; }
        .sidebar-category { padding: 20px 24px 8px; font-size: 0.75rem; font-weight: 700; color: #5f6368; text-transform: uppercase; letter-spacing: 0.8px; border-top: 1px solid #f1f1f1; margin-top: 10px; }
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
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background: #fff; position: fixed; left: 0; top: 0; height: 100%; width: 300px; z-index: 20001;">
                <div style="padding: 28px 24px 12px; font-size: 1.4rem; font-weight: 700; color: #1f1f1f; display: flex; align-items: center; justify-content: space-between;">
                    <span>Store Options</span><span style="font-size: 1.2rem; cursor: pointer; color: #5f6368;" onclick="window.closeFittingRoom()">✕</span>
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
        <div style="height: 100vh; width: 100vw; background: rgba(0,0,0,0.05); position: relative; overflow: hidden; display:flex; align-items:center; justify-content:center;">
            <div style="max-width: 600px; width: 92%; background: #fff; border-radius: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); position: relative; padding: 60px 30px; text-align: center;">
                <div onclick="window.closeFittingRoom()" style="position: absolute; top: 20px; right: 25px; z-index: 30000; color: #999; font-size: 1.5rem; cursor: pointer;">✕</div>
                <div class="dotted-spinner" style="margin-bottom: 30px;"></div>
                <h2 style="font-weight: 900; color: #111; font-size: 1.8rem; letter-spacing: -1px; margin-bottom: 10px;">SUPPORT CENTER</h2>
                <p style="color: #666; font-weight: 500; line-height: 1.6; max-width: 300px; margin: 0 auto 30px;">Loading agent...</p>
                <button onclick="window.closeFittingRoom()" style="background: #111; border: none; padding: 18px 40px; border-radius: 40px; font-weight: 800; color: #fff; cursor: pointer; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">Return</button>
            </div>
        </div>`;
    if (window.chatway) { window.chatway.show(); window.chatway.open(); }
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    
    const filtered = storeCatalog.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) || 
        (c.tags && c.tags.toLowerCase().includes(query))
    );

    if (filtered.length > 0) {
        // 🔥 CRITICAL FIX: Ensure display matches the fixed dock in style.css
        results.style.setProperty('display', 'grid', 'important'); 
        results.innerHTML = filtered.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; width: 100%; box-sizing: border-box;">
                <img src="${item.imgUrl}" style="pointer-events:none; border-radius:10px; width:100%; aspect-ratio:1/1; object-fit:cover;">
                <h4 class="cart-item-name" style="color:#000 !important; font-weight:700; margin-top:10px;">${item.name}</h4>
                <p style="color:#e60023 !important; font-weight:800; font-size:1.1rem;">₦${item.price.toLocaleString()}</p>
            </div>`).join('');
    } else {
        results.style.setProperty('display', 'block', 'important');
        results.innerHTML = `<div style="text-align:center; padding:20px; color:#666; background:#fff; border-radius:12px;">No results found for "${query}"</div>`;
    }
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
        <div style="text-align:center; padding:5px; position:relative;">
            <h2 style="font-weight:900; font-size:1.2rem; color:#111; margin:15px 0; text-transform:uppercase; letter-spacing:1px;">${personalizedTitle}</h2>
            <div class="zoom-container" id="preview-zoom-box"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <div style="padding:15px 10px;">
                <h3 class="summary-text" style="margin-bottom:2px; font-weight:800;">${selectedCloth.name}</h3>
                <p style="color:#e60023; font-weight:800; font-size:1.5rem; margin-bottom:10px;">₦${selectedCloth.price.toLocaleString()}</p>
                <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:1.2rem; text-transform:uppercase; letter-spacing:1px;">Wear it! ✨</button>
            </div>
        </div>`;
    
    const container = document.getElementById('preview-zoom-box'), img = document.getElementById('preview-img');
    container.onclick = (e) => { if (e.target.classList.contains('close-preview-x')) return; img.classList.toggle('zoomed'); };
};

window.proceedToUpload = () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px; position:relative;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:5px;">FINISH YOUR LOOK</h2>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:1.1rem; text-transform:uppercase;">SELECT FROM GALLERY</button>
        </div>`;
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { 
        localUserBase64 = ev.target.result;
        window.startTryOn(); 
    }; 
    reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="position:relative; text-align:center; padding:80px 20px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; width:100%;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div class="dotted-spinner"></div>
            <p style="margin-top:25px; font-weight:800; color:#e60023; text-transform:uppercase; letter-spacing:1px; font-size:0.9rem;">Stitching outfit...</p>
        </div>`;

    try {
        const optimizedUser = await optimizeForAI(localUserBase64);
        const response = await fetch('/api/process-vto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userImage: optimizedUser,
                clothImageUrl: selectedCloth.imgUrl,
                category: selectedCloth.category || "Native"
            })
        });

        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div style="text-align:center; padding:5px; position:relative;">
                    <h2 style="font-weight:900; font-size:1.2rem; color:#111; margin:15px 0; text-transform:uppercase; letter-spacing:1px;">Done!</h2>
                    <div class="zoom-container" id="result-zoom-box">
                        <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                        <img src="data:image/png;base64,${result.image}" class="zoom-image" id="result-img">
                    </div>
                    <div style="padding:15px 10px;">
                        <button onclick="window.buyNow()" style="background:#25D366; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:1.2rem; text-transform:uppercase; letter-spacing:1px;">Buy Look</button>
                    </div>
                </div>`;
            const container = document.getElementById('result-zoom-box'), img = document.getElementById('result-img');
            container.onclick = () => img.classList.toggle('zoomed');
        } else { throw new Error(result.error); }
    } catch (err) {
        resDiv.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                <h2 style="color:#111; font-weight:900;">OOPS!</h2>
                <p style="color:#666; margin-bottom:20px;">${err.message}</p>
                <button onclick="window.proceedToUpload()" style="background:#111; color:white; padding:15px 30px; border-radius:12px; border:none; font-weight:800;">RETRY</button>
            </div>`;
    }
};

window.buyNow = () => {
    const text = `Order: ${selectedCloth.name} \nPrice: ₦${selectedCloth.price.toLocaleString()}`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
};

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adaptiveTextColor = isDarkMode ? 'white' : 'black';
    const styleId = 'dynamic-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; document.head.appendChild(styleTag); }
    styleTag.innerHTML = `#dynamic-greeting, #store-name-display { color: ${adaptiveTextColor} !important; } #ai-input { color: ${adaptiveTextColor}; background: ${isDarkMode ? '#222' : '#f9f9f9'}; }`;
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

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); };