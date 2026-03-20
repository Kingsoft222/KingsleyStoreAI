import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref as dbRef, onValue, update, set, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL, getBlob } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
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
const storage = getStorage(app);
const auth = getAuth(app);
const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let tempUserImageUrl = "", selectedCloth = null, storePhone = "2348000000000", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 
let localUserBase64 = "", windowActiveGreetings = [], gIndex = 0;

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

const injectChatSupport = () => {
    if (document.getElementById('chatway-script')) return;
    const s = document.createElement("script");
    s.id = "chatway-script"; s.async = true;
    s.src = "https://cdn.chatway.app/widget.js?id=govCX46EKb8v";
    document.head.appendChild(s);
};

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    
    // 🎯 ENABLE SIDEBAR & CART TAPS
    const menuIcon = document.querySelector('.fa-bars') || document.getElementById('menu-icon');
    if (menuIcon) {
        menuIcon.style.cursor = 'pointer';
        menuIcon.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    }
    const cartIcon = document.getElementById('cart-icon-container');
    if (cartIcon) cartIcon.onclick = window.showCart;

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search...";
                searchInput.oninput = window.executeSearch;
            }
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4 style="margin:0;color:white;">${data.label1 || 'Luxury'}</h4><p style="margin:5px 0 0;font-size:0.75rem;color:#888;">Shop now</p></div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4 style="margin:0;color:white;">${data.label2 || 'Bespoke'}</h4><p style="margin:5px 0 0;font-size:0.75rem;color:#888;">Exclusive</p></div>`;
            }
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;

            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled !== false) {
                windowActiveGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Welcome!"];
                if (greetingEl) { greetingEl.innerText = windowActiveGreetings[0]; greetingEl.style.display = 'block'; }
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
        if (el && windowActiveGreetings.length > 1 && el.style.display !== 'none') { 
            gIndex = (gIndex + 1) % windowActiveGreetings.length;
            el.innerText = windowActiveGreetings[gIndex]; 
        }
    }, 4000);
    initVoiceSearch();
});

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

// 🎯 IMPROVED MODAL NEXT STEP WITH PROFESSIONAL TEXT
window.proceedToUpload = () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px; position:relative;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:10px;">FINISH YOUR LOOK</h2>
            <p style="color:#666; font-weight:500; margin-bottom:25px; line-height:1.4; padding:0 20px;">Upload your photo showing from head to toe for better results</p>
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

// 🎯 ADOPTED FASTER TRY-ON LOGIC
window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="position:relative; text-align:center; padding:80px 20px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; width:100%;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div class="dotted-spinner"></div>
            <p style="margin-top:25px; font-weight:800; color:#e60023; text-transform:uppercase; letter-spacing:1px; font-size:0.9rem;">Stitching your outfit...</p>
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
                    <h2 style="font-weight:900; font-size:1.2rem; color:#111; margin:15px 0; text-transform:uppercase;">How do you look?</h2>
                    <div class="zoom-container" id="result-zoom-box">
                        <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                        <img src="data:image/png;base64,${result.image}" class="zoom-image" id="result-img">
                    </div>
                    <div style="padding:15px 10px;">
                        <button onclick="window.buyNow()" style="background:#25D366; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; text-transform:uppercase; letter-spacing:1px;">Buy This Look</button>
                    </div>
                </div>`;
            const container = document.getElementById('result-zoom-box'), img = document.getElementById('result-img');
            container.onclick = () => img.classList.toggle('zoomed');
        } else { throw new Error(result.error); }
    } catch (err) {
        resDiv.innerHTML = `<div style="text-align:center; padding:40px 20px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#111; font-weight:900;">OOPS!</h2><p style="color:#666; margin-bottom:20px;">${err.message}</p><button onclick="window.proceedToUpload()" style="background:#111; color:white; padding:15px 30px; border-radius:12px; border:none; font-weight:800;">TRY AGAIN</button></div>`;
    }
};

window.buyNow = () => {
    const text = `Hello! I just tried on the *${selectedCloth.name}* in your AI Showroom and I love it! I'd like to make an order. \n\nPrice: ₦${selectedCloth.price.toLocaleString()}`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
};

function initInspectionPan(boxId, imgId) {
    const box = document.getElementById(boxId), img = document.getElementById(imgId);
    let isPanning = false, startX, startY, currentX = 0, currentY = 0;
    box.onclick = (e) => { if(e.target.classList.contains('close-preview-x')) return; img.classList.toggle('zoomed'); currentX = 0; currentY = 0; img.style.transform = img.classList.contains('zoomed') ? 'scale(3.5)' : 'scale(1)'; };
    box.addEventListener('touchstart', (e) => { if(!img.classList.contains('zoomed')) return; isPanning = true; startX = e.touches[0].clientX - currentX; startY = e.touches[0].clientY - currentY; });
    box.addEventListener('touchmove', (e) => { if(!isPanning) return; currentX = e.touches[0].clientX - startX; currentY = e.touches[0].clientY - startY; img.style.transform = `scale(3.5) translate(${currentX/3.5}px, ${currentY/3.5}px)`; });
    box.addEventListener('touchend', () => isPanning = false);
}

window.showCart = () => { alert(cart.length > 0 ? `You have ${cart.length} items in your cart.` : "Your cart is empty."); };
window.openOptionsMenu = () => {
    const modal = document.getElementById('fitting-room-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    const badge = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#00a2ff" style="margin-left:5px;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    const agentIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#0b57d0"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zm-4 11v6H6v-6h2zm10 6h-2v-6h2v6zm-6 2c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm7.5-5.8c-.3 0-.5.2-.5.5v1.3c0 1.1-.9 2-2 2h-1c-.3 0-.5.2-.5.5s.2.5.5.5h1c1.7 0 3-1.3 3-3V13.7c0-.3-.2-.5-.5-.5z"/></svg>`;

    resDiv.innerHTML = `
        <div id="sidebar-overlay" style="display: block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background:#fff; position:fixed; left:0; top:0; height:100%; width:300px; z-index:21000; overflow-y:auto;">
                <div style="padding:28px 24px; font-size:1.4rem; font-weight:700; display:flex; justify-content:space-between;"><span>Store Options</span><span onclick="window.closeFittingRoom()" style="cursor:pointer;">✕</span></div>
                <div onclick="window.openChatPage()" class="sidebar-item" style="padding:14px 24px; cursor:pointer; color:#0b57d0; font-weight:600; display:flex; align-items:center; gap:12px;">${agentIcon}<span>Chat Support</span></div>
                
                <div class="sidebar-category" style="padding:20px 24px 8px; font-size:0.75rem; font-weight:700; color:#888; text-transform:uppercase; border-top:1px solid #eee;">Luxury Wears</div>
                <div onclick="window.location.assign('?store=kingss1')" class="sidebar-item" style="padding:14px 24px; cursor:pointer; font-weight:600; display:flex; align-items:center;">💎<span>Stella Wears</span>${badge}</div>
                <div onclick="window.location.assign('?store=ifeomaezema1791')" class="sidebar-item" style="padding:14px 24px; cursor:pointer; font-weight:600; display:flex; align-items:center;">👗<span>IFY FASHION</span>${badge}</div>
                
                <div class="sidebar-category" style="padding:20px 24px 8px; font-size:0.75rem; font-weight:700; color:#888; text-transform:uppercase; border-top:1px solid #eee;">Bespoke Fashion</div>
                <div onclick="window.location.assign('?store=adivichi')" class="sidebar-item" style="padding:14px 24px; cursor:pointer; font-weight:600; display:flex; align-items:center;">🧵<span>ADIVICHI FASHION</span>${badge}</div>
                <div onclick="window.location.assign('?store=thomasmongim')" class="sidebar-item" style="padding:14px 24px; cursor:pointer; font-weight:600; display:flex; align-items:center;">👔<span>TOMMY BEST</span>${badge}</div>
                
                <div style="padding:40px 24px 20px; text-align: center; opacity: 0.3; font-size: 0.6rem; font-weight: 800; letter-spacing: 2px;">VIRTUAL MALL AI</div>
            </div>
        </div>`;
};

window.openChatPage = () => {
    injectChatSupport();
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column;"><div onclick="window.closeFittingRoom()" style="position:absolute; top:20px; right:20px; font-size:1.5rem; cursor:pointer;">✕</div><div class="dotted-spinner"></div><p>Connecting Support...</p></div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
};

window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; if(window.chatway){ window.chatway.hide(); window.chatway.close(); } };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function initGlobalUIStyles() { const s = document.createElement('style'); s.innerHTML = `#draggable-chat-head, #chat-close-zone { display: none !important; } .dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin 2s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } } .sidebar-item { display: flex; align-items: center; gap: 16px; padding: 14px 24px; cursor: pointer; color: #1f1f1f; text-decoration: none; font-family: 'Google Sans', sans-serif; font-weight: 600; } .sidebar-category { padding: 20px 24px 8px; font-size: 0.75rem; font-weight: 700; color: #5f6368; text-transform: uppercase; letter-spacing: 0.8px; border-top: 1px solid #f1f1f1; margin-top: 10px; }`; document.head.appendChild(s); }
function initVoiceSearch() { const micBtn = document.getElementById('mic-btn'); if (!micBtn) return; const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRec) return; const recognition = new SpeechRec(); micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e) {} }; recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); }; }
function applyDynamicThemeStyles() { const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const adaptiveTextColor = isDarkMode ? 'white' : 'black'; const styleTag = document.createElement('style'); styleTag.innerHTML = `#store-name-display, #dynamic-greeting { color: ${adaptiveTextColor} !important; }`; document.head.appendChild(styleTag); }