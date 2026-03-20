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

// --- Image Optimization Logic ---
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

// --- Chatway Dynamic Page Injection ---
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
    `;
    document.head.appendChild(style);
}

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query) || (c.tags && c.tags.toLowerCase().includes(query)));
    results.style.display = 'grid';
    results.innerHTML = filtered.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}">
            <h4 class="cart-item-name" style="color:#000 !important; font-weight:700; margin-top:10px;">${item.name}</h4>
            <p style="color:#e60023 !important; font-weight:800; font-size:1.1rem;">₦${item.price.toLocaleString()}</p>
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
    reader.onload = async (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; 
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
            body: JSON.stringify({ userImage: optimizedUser, clothImageUrl: selectedCloth.imgUrl, category: selectedCloth.category || "Native" })
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div style="text-align:center; padding:5px; position:relative;">
                    <h2 style="font-weight:900; font-size:1.2rem; color:#111; margin:15px 0; text-transform:uppercase; letter-spacing:1px;">How do you look?</h2>
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
    } catch (err) { alert(err.message); window.proceedToUpload(); }
};

window.buyNow = () => {
    const text = `Hello! I just tried on the *${selectedCloth.name}* in your AI Showroom and I love it! I'd like to make an order. \n\nPrice: ₦${selectedCloth.price.toLocaleString()}`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
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
    const recognition = new SpeechRec();
    micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e) {} };
    recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); };
}

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); };