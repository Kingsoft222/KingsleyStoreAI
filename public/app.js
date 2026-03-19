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

// --- Chatway Dynamic Page Injection (Permanent/Locked) ---
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
    ensureCartIconExists();
    
    // Greeting state restoration
    const greetingEl = document.getElementById('dynamic-greeting');
    if (greetingEl) greetingEl.innerText = "Loading greetings...";

    const findAndEnableMenu = () => {
        const elements = document.querySelectorAll('button, div, span, i, svg');
        const menuBtn = Array.from(elements).find(el => {
            const rect = el.getBoundingClientRect();
            const isTopLeft = rect.top < 150 && rect.left < 100 && rect.width > 0;
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
        
        /* RESTORE ORIGINAL FLOW: Natural Scrolling, No Overlap */
        #owner-img, #store-name-display, #dynamic-greeting {
            position: relative !important;
            z-index: 10;
        }

        /* Cart Icon: Permanent Top Right Fix */
        #cart-icon-wrapper {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 40000 !important;
            background: rgba(255,255,255,0.9);
            padding: 10px;
            border-radius: 50%;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }

        /* SEARCH VIEWPORT DOCKING: Tucked and Scrollable */
        #ai-results {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            padding: 15px !important;
            width: 100% !important;
            max-height: 55vh !important; 
            overflow-y: auto !important;
            position: absolute !important;
            bottom: 95px !important; /* Above search bar */
            left: 0 !important;
            z-index: 15000 !important;
            background: #fff;
            box-shadow: 0 -10px 25px rgba(0,0,0,0.1);
            border-top-left-radius: 25px;
            border-top-right-radius: 25px;
            -webkit-overflow-scrolling: touch;
        }

        /* MODAL: SINGLE PROFESSIONAL LAYER - FLATTENED */
        #fitting-room-modal {
            display: none; position: fixed; top: 0; left: 0;
            width: 100%; height: 100%; background: rgba(0,0,0,0.85);
            z-index: 50000; align-items: center; justify-content: center;
        }

        .modal-body-flat {
            background: #fff;
            width: 88%;
            max-width: 380px; 
            border-radius: 28px;
            overflow: hidden;
            position: relative;
            padding: 25px 15px;
            box-shadow: 0 40px 90px rgba(0,0,0,0.6);
            animation: modalPop 0.3s ease;
            text-align: center;
        }

        @keyframes modalPop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .dotted-spinner {
            width: 50px; height: 50px;
            border: 5px dotted #e60023;
            border-radius: 50%;
            animation: spin-dotted 2s linear infinite;
            margin: 15px auto;
        }
        @keyframes spin-dotted { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .zoom-container { position: relative; overflow: hidden; width: 100%; height: 45vh; border-radius: 15px; background: #000; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: zoom-in; }
        .zoom-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; transform-origin: center; pointer-events: none; }
        .zoomed { transform: scale(2.8); cursor: zoom-out; }
        .close-preview-x { position: absolute; top: 12px; right: 12px; width: 38px; height: 38px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; z-index: 60000; border: 1.5px solid rgba(255,255,255,0.3); }
    `;
    document.head.appendChild(style);
}

const ensureCartIconExists = () => {
    if (document.getElementById('cart-icon-wrapper')) return;
    const cartDiv = document.createElement('div');
    cartDiv.id = 'cart-icon-wrapper';
    cartDiv.onclick = window.openCart;
    cartDiv.innerHTML = `
        <div style="position:relative;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span id="cart-count-badge" style="position:absolute; top:-8px; right:-8px; background:#e60023; color:white; font-size:10px; font-weight:bold; border-radius:50%; padding:2px 5px; min-width:18px; text-align:center;">0</span>
        </div>`;
    document.body.appendChild(cartDiv);
};

window.openCart = () => {
    const modal = document.getElementById('fitting-room-modal');
    const resDiv = document.getElementById('ai-fitting-result');
    modal.style.display = 'flex';
    
    if (cart.length === 0) {
        resDiv.innerHTML = `<div class="modal-body-flat" style="padding:50px 20px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div style="font-size:3rem; margin-bottom:15px;">🛒</div><h2 style="font-weight:900;">YOUR CART IS EMPTY</h2><p style="color:#666; margin-top:10px;">Select products from the mall to see them here.</p></div>`;
        return;
    }

    const cartHtml = cart.map((item, idx) => `
        <div style="display:flex; align-items:center; gap:15px; background:#f9f9f9; padding:10px; border-radius:12px; margin-bottom:10px; position:relative;">
            <img src="${item.imgUrl}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
            <div style="text-align:left;">
                <h4 style="font-size:0.85rem; font-weight:800; margin:0;">${item.name}</h4>
                <p style="color:#e60023; font-weight:800; margin:3px 0 0;">₦${item.price.toLocaleString()}</p>
            </div>
            <button onclick="window.removeFromCart(${idx}); window.openCart();" style="position:absolute; right:10px; background:none; border:none; color:#ccc; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>`).join('');

    const total = cart.reduce((s, i) => s + i.price, 0);
    resDiv.innerHTML = `
        <div class="modal-body-flat" style="max-height:85vh; overflow-y:auto; padding-top:40px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="font-weight:900; font-size:1.3rem; margin-bottom:20px;">SHOPPING CART</h2>
            <div style="padding:0 5px;">${cartHtml}</div>
            <div style="margin-top:20px; border-top:2px dashed #eee; padding-top:15px;">
                <div style="display:flex; justify-content:space-between; font-weight:900; font-size:1.2rem; margin-bottom:20px;"><span>Total:</span><span>₦${total.toLocaleString()}</span></div>
                <button onclick="window.handleOrder()" style="background:#25D366; color:white; width:100%; padding:18px; border-radius:15px; font-weight:900; border:none; cursor:pointer; font-size:1rem;">CHECKOUT VIA WHATSAPP</button>
            </div>
        </div>`;
};

window.handleOrder = () => {
    const total = cart.reduce((s, i) => s + i.price, 0);
    const msg = `🛡️ *VERIFIED VIRTUALMALL ORDER*%0ATotal: *₦${total.toLocaleString()}*%0A%0AItems:%0A${cart.map(i => `- ${i.name}`).join('%0A')}`;
    const url = `https://wa.me/${storePhone.replace('+', '')}?text=${msg}`;
    window.open(url, '_blank');
    cart = [];
    localStorage.removeItem(`cart_${currentStoreId}`);
    updateCartUI();
    window.closeFittingRoom();
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
        <div class="modal-body-flat">
            <h2 style="font-weight:900; font-size:1.15rem; color:#e60023; margin:0 0 15px; text-transform:capitalize;"><b>${personalizedTitle}</b></h2>
            <div class="zoom-container" id="preview-zoom-box"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <div style="padding:15px 5px 0;">
                <h3 class="summary-text" style="margin-bottom:2px; font-weight:800; font-size:0.95rem;">${selectedCloth.name}</h3>
                <p style="color:#e60023; font-weight:800; font-size:1.1rem; margin-bottom:12px;">₦${selectedCloth.price.toLocaleString()}</p>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.proceedToUpload()" style="flex:1; background:#e60023; color:white; padding:18px; border-radius:12px; font-weight:900; border:none; cursor:pointer; font-size:0.9rem;">WEAR IT! ✨</button>
                    <button onclick="window.addToCartFromShowroom()" style="flex:1; background:#111; color:white; padding:18px; border-radius:12px; font-weight:900; border:none; cursor:pointer; font-size:0.9rem;">ADD TO CART</button>
                </div>
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

window.addToCartFromShowroom = () => {
    if (selectedCloth) {
        cart.push(selectedCloth);
        localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
        updateCartUI();
        window.closeFittingRoom();
    }
};

window.proceedToUpload = () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div class="modal-body-flat" style="padding:40px 20px;">
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
        <div class="modal-body-flat" style="padding:45px 20px;">
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
    styleTag.innerHTML = `
        #dynamic-greeting, #store-name-display, .summary-text { color: ${adaptiveTextColor} !important; } 
        #ai-input { color: ${adaptiveTextColor}; background: ${isDarkMode ? '#222' : '#f9f9f9'}; }
    `;
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
window.updateCartUI = () => { 
    const c = document.getElementById('cart-count-badge'); 
    if (c) c.innerText = cart.length; 
};
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); };