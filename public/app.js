import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref as dbRef, 
    onValue, 
    set, 
    update, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);
const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let localUserBase64 = "", selectedCloth = null, storePhone = "2348000000000", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 
let windowActiveGreetings = [], gIndex = 0;

// --- 🎯 CORE UTILITIES ---
async function optimizeForAI(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 768;
            let width = img.width, height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
    });
}

async function getBase64FromUrl(url) {
    return new Promise((resolve) => {
        fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
            .then(r => r.blob())
            .then(b => {
                const rd = new FileReader();
                rd.onloadend = () => resolve(rd.result.split(',')[1]);
                rd.readAsDataURL(b);
            });
    });
}

const injectChatSupport = () => {
    if (document.getElementById('chatway-script')) return;
    const s = document.createElement("script");
    s.id = "chatway-script"; s.async = true;
    s.src = "https://cdn.chatway.app/widget.js?id=govCX46EKb8v";
    document.head.appendChild(s);
};

// --- 🎯 INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {});
    initGlobalUIStyles(); 

    // 🎯 ENABLE TOP-RIGHT CART & SIDEBAR TAPS
    const menuIcon = document.querySelector('.fa-bars') || document.getElementById('menu-icon');
    if (menuIcon) {
        menuIcon.style.cursor = 'pointer';
        menuIcon.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    }
    const cartIcon = document.getElementById('cart-icon-container');
    if (cartIcon) {
        cartIcon.style.cursor = 'pointer';
        cartIcon.onclick = () => window.openCart();
    }

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search...";
                searchInput.oninput = window.executeSearch;
            }
            // Store Ads (Split Cards)
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4 style="margin:0;color:white;">${data.label1 || 'Ladies Wear'}</h4><p style="margin:5px 0 0;font-size:0.75rem;color:#888;">Shop now</p></div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4 style="margin:0;color:white;">${data.label2 || 'Dinner Wear'}</h4><p style="margin:5px 0 0;font-size:0.75rem;color:#888;">Shop now</p></div>`;
            }
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;

            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled !== false) {
                windowActiveGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Welcome!"];
                if (greetingEl) greetingEl.style.display = 'block';
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
        if (el && windowActiveGreetings.length > 0 && el.style.display !== 'none') { 
            el.innerText = windowActiveGreetings[gIndex % windowActiveGreetings.length]; 
            gIndex++;
        }
    }, 4000);
    initVoiceSearch();
});

// --- 🎯 SEARCH & RENDER ---
window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => (c.name && c.name.toLowerCase().includes(query)));
    results.style.display = filtered.length > 0 ? 'grid' : 'none';
    results.innerHTML = filtered.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}"><h4>${item.name}</h4><p>₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

window.renderProducts = (items) => {
    const listContainer = document.getElementById('product-list') || document.getElementById('main-catalog');
    if (!listContainer) return;
    listContainer.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}" alt="${item.name}"><h4 class="cart-item-name">${item.name}</h4>
            <p style="color:#e60023 !important; font-weight:800;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

// --- 🎯 TRY-ON FLOW ---
window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    if (!selectedCloth) return;
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:5px; position:relative;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <h3 style="margin-top:15px; font-weight:800; color:#000;">${selectedCloth.name}</h3>
            <p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p>
            <button onclick="window.proceedToUpload()" id="wear-it-btn" style="background:#e60023; color:white; padding:20px; width:90%; border-radius:14px; font-weight:900; border:none; cursor:pointer; margin-top:10px; text-transform:uppercase;">Wear it! ✨</button>
        </div>`;
    initInspectionPan('preview-zoom-box', 'preview-img');
};

window.proceedToUpload = () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px; position:relative;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:10px;">FINISH YOUR LOOK</h2>
            <p style="color:#666; font-weight:600; margin-bottom:25px; line-height:1.4; padding:0 20px;">Upload your photo showing from head to toe for better results</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; text-transform:uppercase;">SELECT FROM GALLERY</button>
        </div>`;
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; 
    reader.readAsDataURL(file); 
};

// 🎯 PROCESSING MODAL Logic
window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const fullStoreName = document.getElementById('store-name-display').innerText;
    const vendorFirstName = fullStoreName.split(' ')[0] || "Vendor";
    
    resDiv.innerHTML = `
        <div class="loader-container">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:5px;">${vendorFirstName}'s ShowRoom</h2>
            <p style="color:#000; font-weight:800; margin-bottom:25px; text-transform:uppercase; letter-spacing:1px;">STITCHING YOUR OUTFIT</p>
            <div class="dotted-spinner"></div>
        </div>`;

    try {
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: localUserBase64, clothImage: rawCloth, category: selectedCloth.category || "Native" }) 
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                    <div class="zoom-container" id="result-zoom-box"><img src="data:image/jpeg;base64,${result.image}" class="zoom-image" id="result-img"></div>
                    <button onclick="window.addToCart()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; margin-top:15px; border:none; cursor:pointer;">Add to Cart 🛍️</button>
                </div>`;
            const container = document.getElementById('result-zoom-box'), img = document.getElementById('result-img');
            container.onclick = () => img.classList.toggle('zoomed');
        } else { alert("AI error"); window.closeFittingRoom(); }
    } catch (e) { alert("Server error"); window.closeFittingRoom(); }
};

// --- 🎯 CART & CHECKOUT ---
window.addToCart = () => {
    if(!selectedCloth) return;
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI(); 
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:4rem; margin-bottom:20px;">✅</div>
            <h2 style="color:#111; font-weight:900;">ADDED TO CART</h2>
            <p style="color:#666; margin-bottom:30px;">Item added successfully to your shopping bag.</p>
            <button onclick="window.closeFittingRoom()" style="width:100%; padding:18px; background:#555; color:white; border-radius:12px; font-weight:bold; border:none; cursor:pointer; margin-bottom:10px;">Check another one</button>
            <button onclick="window.openCart()" style="width:100%; padding:18px; background:#e60023; color:white; border-radius:12px; font-weight:bold; border:none; cursor:pointer;">Proceed to cart ➔</button>
        </div>`;
};

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) {
        resDiv.innerHTML = `<div style="padding:80px 20px; text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h3 style="color:#111;">Your cart is empty</h3></div>`;
        return;
    }
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
            <div style="text-align:left;"><p style="margin:0; font-weight:bold; color:#000;">${item.name}</p><p style="margin:0; color:#e60023; font-weight:700;">₦${item.price.toLocaleString()}</p></div>
            <button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>`).join('');
    
    resDiv.innerHTML = `
        <div style="padding:20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:20px;">YOUR CART SUMMARY</h2>
            <div style="max-height:300px; overflow-y:auto; margin-bottom:20px; padding-right:5px;">${itemsHTML}</div>
            <div style="display:flex; justify-content:space-between; font-weight:900; font-size:1.2rem; margin-bottom:20px; border-top:2px solid #e60023; padding-top:15px; color:#000;">
                <span>Total:</span><span>₦${total.toLocaleString()}</span>
            </div>
            <button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:bold; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; gap:10px;">
                Checkout via WhatsApp
            </button>
        </div>`;
};

window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((s, i) => s + i.price, 0);
    const orderId = "VM-" + Math.random().toString(36).substr(2, 5).toUpperCase();
    const msg = `🛡️ *VIRTUALMALL ORDER*\nID: *${orderId}*\nTotal: *₦${total.toLocaleString()}*\n\nItems:\n${cart.map(i => `- ${i.name}`).join('\n')}`;
    const waUrl = `https://wa.me/${storePhone.replace('+', '')}?text=${encodeURIComponent(msg)}`;
    window.location.assign(waUrl);
};

// --- 🎯 SIDEBAR & UI ---
window.openOptionsMenu = () => {
    const modal = document.getElementById('fitting-room-modal');
    modal.style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    const badge = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#00a2ff" style="margin-left:5px;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    resDiv.innerHTML = `
        <div id="sidebar-overlay" style="display: block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background:#fff; position:fixed; left:0; top:0; height:100%; width:300px; z-index:21000; overflow-y:auto;">
                <div style="padding:28px 24px; font-size:1.4rem; font-weight:700; display:flex; justify-content:space-between; color:#111;"><span>Store Options</span><span onclick="window.closeFittingRoom()" style="cursor:pointer;">✕</span></div>
                <div onclick="window.openChatPage()" class="sidebar-item" style="padding:14px 24px; cursor:pointer; color:#0b57d0; font-weight:600;">Chat Support</div>
                <div class="sidebar-category" style="padding:20px 24px 8px; font-size:0.75rem; font-weight:700; color:#888; text-transform:uppercase; border-top:1px solid #eee;">Luxury Wears</div>
                <div onclick="window.location.assign('?store=kingss1')" class="sidebar-item" style="padding:14px 24px; cursor:pointer; font-weight:600; color:#111;">Stella Wears ${badge}</div>
                <div onclick="window.location.assign('?store=ifeomaezema1791')" class="sidebar-item" style="padding:14px 24px; cursor:pointer; font-weight:600; color:#111;">IFY FASHION ${badge}</div>
                <div class="sidebar-category" style="padding:20px 24px 8px; font-size:0.75rem; font-weight:700; color:#888; text-transform:uppercase; border-top:1px solid #eee;">Bespoke Fashion</div>
                <div onclick="window.location.assign('?store=adivichi')" class="sidebar-item" style="padding:14px 24px; cursor:pointer; font-weight:600; color:#111;">ADIVICHI FASHION ${badge}</div>
            </div>
        </div>`;
};

window.openChatPage = () => {
    injectChatSupport();
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column;"><div onclick="window.closeFittingRoom()" style="position:absolute; top:20px; right:20px; font-size:1.5rem; cursor:pointer;">✕</div><div class="dotted-spinner"></div><p>Connecting Support...</p></div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
};

function initInspectionPan(boxId, imgId) {
    const box = document.getElementById(boxId), img = document.getElementById(imgId);
    let isPanning = false, startX, startY, currentX = 0, currentY = 0;
    box.onclick = (e) => { if(e.target.classList.contains('close-preview-x')) return; img.classList.toggle('zoomed'); currentX = 0; currentY = 0; img.style.transform = img.classList.contains('zoomed') ? 'scale(3.5)' : 'scale(1)'; };
    box.addEventListener('touchstart', (e) => { if(!img.classList.contains('zoomed')) return; isPanning = true; startX = e.touches[0].clientX - currentX; startY = e.touches[0].clientY - currentY; });
    box.addEventListener('touchmove', (e) => { if(!isPanning) return; currentX = e.touches[0].clientX - startX; currentY = e.touches[0].clientY - startY; img.style.transform = `scale(3.5) translate(${currentX/3.5}px, ${currentY/3.5}px)`; });
    box.addEventListener('touchend', () => isPanning = false);
}

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; if(window.chatway){ window.chatway.hide(); window.chatway.close(); } };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.openCart(); updateCartUI(); };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };

function initGlobalUIStyles() { 
    const s = document.createElement('style'); 
    s.innerHTML = `.dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin 2s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } } .sidebar-item { display:block; text-decoration:none; } .sidebar-category { padding:20px 24px 8px; font-size:0.75rem; font-weight:700; color:#888; text-transform:uppercase; border-top:1px solid #eee; margin-top:10px; }`; 
    document.head.appendChild(s); 
}

function initVoiceSearch() { 
    const micBtn = document.getElementById('mic-btn'); 
    if (!micBtn) return; 
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition; 
    if (!SpeechRec) return; 
    const recognition = new SpeechRec(); 
    micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e) {} }; 
    recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); }; 
}

function applyDynamicThemeStyles() { 
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; 
    const adaptiveTextColor = isDarkMode ? 'white' : 'black'; 
    const styleTag = document.createElement('style'); 
    styleTag.innerHTML = `#store-name-display, #dynamic-greeting { color: ${adaptiveTextColor} !important; }`; 
    document.head.appendChild(styleTag); 
}