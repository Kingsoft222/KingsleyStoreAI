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

// --- RESTORED: Image Optimization ---
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

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    
    const greetingEl = document.getElementById('dynamic-greeting');

    // 🎯 RESTORED: SIDEBAR TOGGLE
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
            
            // 🎯 RESTORED: GREETING TOGGLE LOGIC
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
            updateCartUI(); // 🎯 ENABLED: Sync cart on load
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

// 🎯 RESTORED: CART SYNC LOGIC
window.updateCartUI = () => {
    const cartBadge = document.getElementById('cart-count');
    if (cartBadge) {
        cartBadge.innerText = cart.length;
        cartBadge.style.display = cart.length > 0 ? 'flex' : 'none';
    }
};

window.renderProducts = (items) => {
    const listContainer = document.getElementById('product-list') || document.getElementById('main-catalog');
    if (!listContainer) return;
    listContainer.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; pointer-events:auto !important;">
            <img src="${item.imgUrl}" alt="${item.name}" style="pointer-events:none;">
            <h4 class="cart-item-name" style="color:#000 !important; font-weight:700;">${item.name}</h4>
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
                <h4 class="cart-item-name" style="color:#000 !important; font-weight:700;">${item.name}</h4>
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
    resDiv.innerHTML = `
        <div style="padding: 25px; text-align: left; background: #fff; height: 100vh; width: 85vw; border-radius: 0 30px 30px 0;">
            <div style="font-size: 1.6rem; font-weight: 900; margin-bottom: 30px; display: flex; justify-content: space-between; align-items:center; color:#111;">
                <span>STORE OPTIONS</span><span onclick="window.closeFittingRoom()" style="cursor:pointer; color:#999; font-size:1.2rem;">✕</span>
            </div>
            <div onclick="window.location.reload()" style="padding: 20px 0; border-bottom: 1px solid #f1f1f1; font-weight: 700; color:#111;">Refresh Shop</div>
            <div onclick="window.closeFittingRoom()" style="padding: 20px 0; border-bottom: 1px solid #f1f1f1; font-weight: 700; color:#111;">Close Menu</div>
        </div>`;
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    if (!selectedCloth) return;
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:10px;">
            <div class="zoom-container"><img src="${selectedCloth.imgUrl}" style="width:100%; border-radius:12px;"></div>
            <h3 style="margin: 15px 0 5px;">${selectedCloth.name}</h3>
            <p style="color:#e60023; font-weight:900; font-size:1.4rem; margin-bottom:20px;">₦${selectedCloth.price.toLocaleString()}</p>
            <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:1.1rem;">Try it on! ✨</button>
        </div>`;
};

window.proceedToUpload = () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <div onclick="window.closeFittingRoom()" style="text-align:right; cursor:pointer; color:#999; font-weight:bold;">✕</div>
            <h2 style="color:#111; margin-bottom:20px;">UPLOAD YOUR PHOTO</h2>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer;">SELECT FROM GALLERY</button>
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
            resDiv.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <img src="data:image/png;base64,${result.image}" style="width:100%; border-radius:12px;">
                    <button onclick="window.buyNow()" style="background:#25D366; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; margin-top:15px; cursor:pointer;">BUY ON WHATSAPP</button>
                </div>`;
        }
    } catch (err) { alert("Error: " + err.message); window.closeFittingRoom(); }
};

window.buyNow = () => {
    const text = `I'm interested in: ${selectedCloth.name} (₦${selectedCloth.price.toLocaleString()})`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
};

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adaptiveTextColor = isDarkMode ? 'white' : 'black';
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `#dynamic-greeting, #store-name-display { color: adaptiveTextColor !important; }`;
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
    style.innerHTML = `
        #draggable-chat-head, #chat-close-zone, [id*="dummy-chat"] { display: none !important; }
        .dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin-dotted 2s linear infinite; margin: 0 auto; }
        @keyframes spin-dotted { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
}

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };