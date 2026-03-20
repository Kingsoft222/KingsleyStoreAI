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

    const findAndEnableMenu = () => {
        const elements = document.querySelectorAll('button, div, span, i, svg');
        const menuBtn = Array.from(elements).find(el => {
            const rect = el.getBoundingClientRect();
            const isTopLeft = rect.top < 100 && rect.left < 100 && rect.width > 0;
            return isTopLeft && (el.innerText.includes('☰') || el.innerHTML.includes('svg') || el.classList.contains('fa-bars'));
        });
        if (menuBtn && !menuBtn.onclick) {
            menuBtn.style.cursor = 'pointer';
            menuBtn.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
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
                searchInput.oninput = window.executeSearch;
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
            } else {
                if (greetingEl) greetingEl.style.display = 'none';
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
        if (el && window.activeGreetings.length > 1 && el.style.display !== 'none') { 
            gIndex = (gIndex + 1) % window.activeGreetings.length;
            el.innerText = window.activeGreetings[gIndex]; 
        }
    }, 4000);
    initVoiceSearch();
});

window.updateCartUI = () => {
    const c = document.getElementById('cart-count');
    if (c) c.innerText = cart.length;
};

window.renderProducts = (items) => {
    const listContainer = document.getElementById('product-list') || document.getElementById('main-catalog');
    if (!listContainer) return;
    listContainer.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; pointer-events:auto !important;">
            <img src="${item.imgUrl}" alt="${item.name}" style="pointer-events:none;">
            <h4 class="cart-item-name" style="color:#fff !important; font-weight:700;">${item.name}</h4>
            <p style="color:#e60023 !important; font-weight:800;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
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
        results.style.display = 'grid';
        results.innerHTML = filtered.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; pointer-events:auto !important;">
                <img src="${item.imgUrl}" style="pointer-events:none;">
                <h4 class="cart-item-name" style="color:#fff !important; font-weight:700;">${item.name}</h4>
                <p style="color:#e60023 !important; font-weight:800;">₦${item.price.toLocaleString()}</p>
            </div>`).join('');
    } else {
        results.style.display = 'none';
    }
};

window.openOptionsMenu = () => {
    const modal = document.getElementById('fitting-room-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    const verifiedIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#00a2ff" style="margin-left:5px;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    const agentIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#0b57d0"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zm-4 11v6H6v-6h2zm10 6h-2v-6h2v6zm-6 2c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm7.5-5.8c-.3 0-.5.2-.5.5v1.3c0 1.1-.9 2-2 2h-1c-.3 0-.5.2-.5.5s.2.5.5.5h1c1.7 0 3-1.3 3-3V13.7c0-.3-.2-.5-.5-.5z"/></svg>`;

    resDiv.innerHTML = `
        <div id="sidebar-overlay" style="display: block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background: #fff; position: fixed; left: 0; top: 0; height: 100%; width: 300px; z-index: 20001; overflow-y: auto; display: flex; flex-direction: column;">
                <div style="padding: 28px 24px 12px; font-size: 1.4rem; font-weight: 700; color: #1f1f1f; display: flex; align-items: center; justify-content: space-between;">
                    <span>Store Options</span><span style="font-size: 1.2rem; cursor: pointer; color: #5f6368;" onclick="window.closeFittingRoom()">✕</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <div onclick="window.openChatPage()" style="display: flex; align-items: center; gap: 16px; padding: 14px 24px; cursor: pointer; color: #1f1f1f; font-weight: 600;">
                        <span>${agentIcon}</span><span>Chat Support</span>
                    </div>
                    <div class="sidebar-category" style="padding: 20px 24px 8px; font-size: 0.75rem; font-weight: 700; color: #5f6368; text-transform: uppercase; letter-spacing: 0.8px; border-top: 1px solid #f1f1f1; margin-top: 10px;">Verified Stores</div>
                    <div onclick="window.location.assign('?store=kingss1')" style="display: flex; align-items: center; padding: 14px 24px; cursor: pointer; color: #1f1f1f; font-weight: 600;">
                        <span>Stella Wears</span>${verifiedIcon}
                    </div>
                    <div onclick="window.location.assign('?store=ifeomaezema1791')" style="display: flex; align-items: center; padding: 14px 24px; cursor: pointer; color: #1f1f1f; font-weight: 600;">
                        <span>IFY FASHION</span>${verifiedIcon}
                    </div>
                    <div onclick="window.location.assign('?store=adivichi')" style="display: flex; align-items: center; padding: 14px 24px; cursor: pointer; color: #1f1f1f; font-weight: 600;">
                        <span>ADIVICHI FASHION</span>${verifiedIcon}
                    </div>
                    <div onclick="window.location.assign('?store=thomasmongim')" style="display: flex; align-items: center; padding: 14px 24px; cursor: pointer; color: #1f1f1f; font-weight: 600;">
                        <span>TOMMY BEST</span>${verifiedIcon}
                    </div>
                    <div style="padding: 40px 24px 20px; text-align: center; opacity: 0.3; font-size: 0.6rem; font-weight: 800; letter-spacing: 2px;">VIRTUAL MALL AI</div>
                </div>
            </div>
        </div>`;
};

// 🎯 UPDATED: Chat Support now triggers properly
window.openChatPage = () => {
    injectChatSupport();
    const modal = document.getElementById('fitting-room-modal');
    const resDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    resDiv.innerHTML = `
        <div style="text-align:center; padding:80px 20px;">
            <div class="dotted-spinner"></div>
            <p style="margin-top:20px; font-weight:800; color:#111;">Connecting to Agent...</p>
            <button onclick="window.closeFittingRoom()" style="margin-top:20px; background:#111; color:#fff; border:none; padding:10px 20px; border-radius:10px;">Return to Shop</button>
        </div>`;
    
    // Check if Chatway is ready, then open it
    const checkChat = setInterval(() => {
        if (window.chatway) {
            window.chatway.show();
            window.chatway.open();
            clearInterval(checkChat);
        }
    }, 500);
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    if (!selectedCloth) return;
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="text-align:center; padding:10px;"><img src="${selectedCloth.imgUrl}" style="width:100%; border-radius:12px;"><h3>${selectedCloth.name}</h3><button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:15px; width:100%; border-radius:12px; border:none; font-weight:900; cursor:pointer;">Wear it! ✨</button></div>`;
};

window.proceedToUpload = () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="text-align:center; padding:20px;"><h2>SELECT PHOTO</h2><input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" /><button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer;">SELECT PHOTO</button></div>`;
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; 
    reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="text-align:center; padding:80px 20px;"><div class="dotted-spinner"></div><p style="margin-top:20px; font-weight:bold; color:#e60023;">Processing...</p></div>`;
    try {
        const optimizedUser = await optimizeForAI(localUserBase64);
        const response = await fetch('/api/process-vto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: optimizedUser, clothImageUrl: selectedCloth.imgUrl, category: selectedCloth.category || "Native" })
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `<div style="text-align:center; padding:10px;"><img src="data:image/png;base64,${result.image}" style="width:100%; border-radius:12px;"><button onclick="window.buyNow()" style="background:#25D366; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; margin-top:15px; cursor:pointer;">BUY ON WHATSAPP</button></div>`;
        }
    } catch (err) { alert("Error: " + err.message); window.closeFittingRoom(); }
};

window.buyNow = () => {
    const text = `Order: ${selectedCloth.name} (₦${selectedCloth.price.toLocaleString()})`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
};

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adaptiveTextColor = isDarkMode ? 'white' : 'black';
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `#dynamic-greeting, #store-name-display { color: ${adaptiveTextColor} !important; }`;
    document.head.appendChild(styleTag);
}

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn'); if (!micBtn) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRec) return;
    const recognition = new SpeechRec();
    micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e) {} };
    recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); };
}

function initGlobalUIStyles() {
    const style = document.createElement('style');
    style.innerHTML = `#draggable-chat-head, #chat-close-zone, [id*="dummy-chat"] { display: none !important; } .dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin-dotted 2s linear infinite; margin: 0 auto; } @keyframes spin-dotted { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
}

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };