import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref as dbRef, onValue, update, set, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// --- 🎯 RAW STABLE UTILITIES ---
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
            resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
        };
    });
}

async function getBase64FromUrl(url) {
    try {
        const r = await fetch(url);
        const blob = await r.blob();
        return new Promise((resolve) => {
            const rd = new FileReader();
            rd.onloadend = () => resolve(rd.result.split(',')[1]);
            rd.readAsDataURL(blob);
        });
    } catch (e) { return ""; }
}

// --- 🚀 FAST MACHINE ENGINE ---
window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const fullStoreName = document.getElementById('store-name-display').innerText;
    const vendorFirstName = fullStoreName.split(' ')[0] || "Vendor";
    
    resDiv.innerHTML = `
        <div style="text-align:center; padding:40px 10px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <h2 style="color:#e60023; font-weight:900; font-size:1.8rem; margin-bottom:5px;">${vendorFirstName}'s ShowRoom</h2>
            <p style="color:#000; font-weight:800; font-size:1rem; margin-bottom:30px; text-transform:uppercase; letter-spacing:1px;">STITCHING YOUR OUTFIT</p>
            <div class="dotted-spinner"></div>
        </div>`;

    try {
        const optimizedUser = await optimizeForAI(localUserBase64);
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: optimizedUser, clothImage: rawCloth, category: selectedCloth.category || "Native" }) 
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div style="text-align:center;">
                    <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
                    <div class="zoom-container" id="result-zoom-box"><img src="data:image/jpeg;base64,${result.image}" class="zoom-image" id="result-img"></div>
                    <button onclick="window.addToCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; margin-top:20px; border:none; cursor:pointer; text-transform:uppercase;">Add to Cart 🛍️</button>
                </div>`;
            const container = document.getElementById('result-zoom-box'), img = document.getElementById('result-img');
            container.onclick = () => img.classList.toggle('zoomed');
        } else { alert("AI Error"); window.closeFittingRoom(); }
    } catch (e) { alert("Connection Error"); window.closeFittingRoom(); }
};

// --- 🎯 CORE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {});
    initGlobalUIStyles(); 

    // 1. Sidebar Toggle
    const menuIcon = document.getElementById('menu-icon');
    if (menuIcon) menuIcon.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    
    // 2. Cart Icon
    const cartIcon = document.getElementById('cart-icon-container');
    if (cartIcon) cartIcon.onclick = () => window.openCart();

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) searchInput.placeholder = data.searchHint || "Search...";
            
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4>🔥 ${data.label1 || 'Hoodies'}</h4><p>Shop now</p></div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4>🔥 ${data.label2 || 'Corporate'}</h4><p>Shop now</p></div>`;
            }
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;

            if (data.catalog) {
                storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
                window.renderProducts(storeCatalog);
            }
            updateCartUI();
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && windowActiveGreetings.length > 0) { 
            el.innerText = windowActiveGreetings[gIndex % windowActiveGreetings.length]; 
            gIndex++;
        }
    }, 4000);

    initVoiceSearch();
});

// --- 🎯 PRODUCT RENDER (CLICKABILITY LOCKED) ---
window.renderProducts = (items) => {
    const results = document.getElementById('ai-results');
    if (!results) return;
    results.style.display = 'grid';
    results.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; pointer-events:auto !important;">
            <img src="${item.imgUrl}" alt="${item.name}">
            <h4 class="cart-item-name">${item.name}</h4>
            <p>₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase().trim();
    if (!q) { document.getElementById('ai-results').style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q));
    window.renderProducts(filtered);
};

// --- 🎯 MIC & VOICE SEARCH ---
function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!micBtn || !SpeechRec) return;
    const recognition = new SpeechRec();
    micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e){} };
    recognition.onresult = (e) => {
        document.getElementById('ai-input').value = e.results[0][0].transcript;
        micBtn.style.color = "#5f6368";
        window.executeSearch();
    };
}

// ... Pan, ModalChoice, Cart Logic remain identical to stable versions ...
window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="text-align:center;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <h3 style="color:#000; margin-top:15px; font-weight:800;">${selectedCloth.name}</h3>
            <p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p>
            <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:20px; width:90%; border-radius:14px; font-weight:900; border:none; cursor:pointer; margin-top:10px;">Wear it! ✨</button>
        </div>`;
    initInspectionPan('preview-zoom-box', 'preview-img');
};

window.proceedToUpload = () => {
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="text-align:center; padding:20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900;">FINISH YOUR LOOK</h2>
            <p style="color:#666; font-weight:600; margin-bottom:25px;">Upload full photo showing head to toe</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none;">SELECT PHOTO</button>
        </div>`;
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; 
    reader.readAsDataURL(file); 
};

window.addToCart = () => {
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI(); 
    window.closeFittingRoom();
};

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) { resDiv.innerHTML = `<div style="text-align:center; padding:50px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">×</div><h3 style="color:#000;">Cart is empty</h3></div>`; return; }
    let total = cart.reduce((s, i) => s + i.price, 0);
    resDiv.innerHTML = `
        <div style="padding:10px; color:#000;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <h2 style="color:#e60023; font-weight:900;">CART SUMMARY</h2>
            ${cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; margin-bottom:15px;"><div><b>${item.name}</b><br>₦${item.price.toLocaleString()}</div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:red;">✕</button></div>`).join('')}
            <div style="display:flex; justify-content:space-between; font-weight:900; border-top:1px solid #eee; padding-top:10px;"><span>Total:</span><span>₦${total.toLocaleString()}</span></div>
            <button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:bold; margin-top:20px;">Checkout WhatsApp</button>
        </div>`;
};

window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-overlay" style="display:block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background:#fff; position:fixed; left:0; top:0; height:100%; width:300px; z-index:21000; overflow-y:auto; text-align:left; padding:20px;">
                <div style="font-size:1.4rem; font-weight:700; display:flex; justify-content:space-between; color:#111; margin-bottom:20px;"><span>Options</span><span onclick="window.closeFittingRoom()">×</span></div>
                <div style="color:#888; font-size:0.75rem; font-weight:700; text-transform:uppercase; border-top:1px solid #eee; padding-top:20px;">Luxury Wears</div>
                <div onclick="window.location.assign('?store=kingss1')" style="padding:15px 0; color:#111; font-weight:600;">Stella Wears</div>
                <div style="color:#888; font-size:0.75rem; font-weight:700; text-transform:uppercase; border-top:1px solid #eee; padding-top:20px;">Bespoke Fashion</div>
                <div onclick="window.location.assign('?store=adivichi')" style="padding:15px 0; color:#111; font-weight:600;">ADIVICHI FASHION</div>
            </div>
        </div>`;
};

function initInspectionPan(boxId, imgId) {
    const box = document.getElementById(boxId), img = document.getElementById(imgId);
    let isPanning = false, startX, startY, currentX = 0, currentY = 0;
    box.onclick = (e) => { if(e.target.classList.contains('close-preview-x')) return; img.classList.toggle('zoomed'); currentX = 0; currentY = 0; img.style.transform = img.classList.contains('zoomed') ? 'scale(3.5)' : 'scale(1)'; };
    box.addEventListener('touchstart', (e) => { if(!img.classList.contains('zoomed')) return; isPanning = true; startX = e.touches[0].clientX - currentX; startY = e.touches[0].clientY - currentY; });
    box.addEventListener('touchmove', (e) => { if(!isPanning) return; currentX = e.touches[0].clientX - startX; currentY = e.touches[0].clientY - startY; img.style.transform = `scale(3.5) translate(${currentX/3.5}px, ${currentY/3.5}px)`; });
    box.addEventListener('touchend', () => isPanning = false);
}
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.openCart(); updateCartUI(); };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function initGlobalUIStyles() { const s = document.createElement('style'); s.innerHTML = `.dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin 2s linear infinite; margin: 0 auto; } @keyframes spin { 100% { transform: rotate(360deg); } }`; document.head.appendChild(s); }
function applyDynamicThemeStyles() { const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const el = document.getElementById('store-name-display'); if(el) el.style.color = isDark ? 'white' : 'black'; }