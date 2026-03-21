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

// --- 🚀 THE UNTOUCHED MACHINE ---
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

// --- 🎧 CHAT SUPPORT LOGIC ---
const injectChatSupport = () => {
    if (document.getElementById('chatway-script')) return;
    const s = document.createElement("script");
    s.id = "chatway-script"; s.async = true;
    s.src = "https://cdn.chatway.app/widget.js?id=govCX46EKb8v";
    document.head.appendChild(s);
};

window.openChatPage = () => {
    injectChatSupport();
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="height:400px; display:flex; align-items:center; justify-content:center; flex-direction:column;">
            <div class="dotted-spinner"></div>
            <p style="margin-top:20px; font-weight:700; color:#111;">Launching Support...</p>
            <button onclick="window.closeFittingRoom()" style="margin-top:25px; padding:12px 30px; border-radius:30px; border:1px solid #ddd; background:#f9f9f9; font-weight:800; cursor:pointer; color:#333;">Return to Store</button>
        </div>`;
    
    // Check for Chatway activation
    const check = setInterval(() => { 
        if(window.chatway) { 
            window.chatway.show(); 
            window.chatway.open(); 
            clearInterval(check); 
        } 
    }, 500);
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const storeNameDisplay = document.getElementById('store-name-display').innerText;
    const firstName = storeNameDisplay.split(' ')[0] || "Store";
    resDiv.innerHTML = `
        <div style="position:relative; text-align:center; padding:80px 20px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; width:100%;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:5px;">${firstName}'s Showroom</h2>
            <p style="margin-bottom:25px; font-weight:800; color:#000; text-transform:uppercase; letter-spacing:1px; font-size:0.9rem;">Stitching your outfit...</p>
            <div class="dotted-spinner"></div>
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
                    <h2 style="font-weight:900; font-size:1.2rem; color:#111; margin:15px 0; text-transform:uppercase;">How do you look?</h2>
                    <div class="zoom-container" id="result-zoom-box">
                        <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                        <img src="data:image/png;base64,${result.image}" class="zoom-image" id="result-img">
                    </div>
                    <div style="padding:15px 10px;">
                        <button onclick="window.buyNow()" style="background:#25D366; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none; cursor:pointer; text-transform:uppercase;">Buy This Look</button>
                    </div>
                </div>`;
            initInspectionPan('result-zoom-box', 'result-img');
        } else { throw new Error(); }
    } catch (err) { resDiv.innerHTML = `<div style="text-align:center; padding:40px 20px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#111;">Try Again</h2><button onclick="window.proceedToUpload()" style="background:#111; color:white; padding:15px 30px; border-radius:12px; border:none;">RETRY</button></div>`; }
};

// --- 🎯 BOOTUP ---
document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.showCart;
    document.querySelector('.send-circle').onclick = window.executeSearch;

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const input = document.getElementById('ai-input');
            if (input) { input.placeholder = data.searchHint || "Search..."; input.value = ""; }
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')">${data.label1 || 'Luxury'}</div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')">${data.label2 || 'Bespoke'}</div>`;
            }
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.greetingsEnabled !== false) {
                windowActiveGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Welcome!"];
                const el = document.getElementById('dynamic-greeting');
                if (el) { el.innerText = windowActiveGreetings[0]; el.style.display = 'block'; }
            }
            if (data.catalog) { storeCatalog = Object.keys(data.catalog).map(k => ({ id: k, ...data.catalog[k] })); }
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

window.renderProducts = (items) => {
    const res = document.getElementById('ai-results');
    if (!res) return;
    res.style.display = 'grid';
    res.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}"><h4>${item.name}</h4><p>₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase().trim();
    if (!q) { document.getElementById('ai-results').style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => (c.name && c.name.toLowerCase().includes(q)));
    window.renderProducts(filtered);
};

window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const badge = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#00a2ff" style="margin-left:5px;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-overlay" style="display:block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()">
                <div style="padding:25px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <span onclick="window.openChatPage()" style="color:#0b57d0; font-weight:700; cursor:pointer;">🎧 Chat Support</span>
                    <span onclick="window.closeFittingRoom()" style="font-size:1.5rem; cursor:pointer;">✕</span>
                </div>
                <div style="padding:0 20px;"><h2 style="font-size:1.4rem; font-weight:900;"><span style="color:#e60023;">Store</span> Option</h2></div>
                <div style="padding:20px; display:flex; flex-direction:column; gap:15px;">
                    <div style="font-size:0.75rem; font-weight:800; color:#888; text-transform:uppercase;">Verified Stores ${badge}</div>
                    <div style="color:#555; font-weight:700; font-size:0.8rem;">LUXURY WEARS</div>
                    <div onclick="window.location.assign('?store=kingss1')" style="font-weight:600; cursor:pointer;">💎 Stella Wears ${badge}</div>
                    <div onclick="window.location.assign('?store=ifeomaezema1791')" style="font-weight:600; cursor:pointer;">👗 IFY FASHION ${badge}</div>
                    <div style="color:#555; font-weight:700; font-size:0.8rem; margin-top:10px;">BESPOKE FASHION</div>
                    <div onclick="window.location.assign('?store=adivichi')" style="font-weight:600; cursor:pointer;">🧵 ADIVICHI FASHION ${badge}</div>
                    <div onclick="window.location.assign('?store=thomasmongim')" style="font-weight:600; cursor:pointer;">👔 TOMMY BEST ${badge}</div>
                    <div style="font-size:0.75rem; font-weight:800; color:#ccc; text-transform:uppercase; border-top:1px solid #eee; padding-top:15px;">Unverified Stores</div>
                </div>
            </div>
        </div>`;
};

function initInspectionPan(boxId, imgId) {
    const box = document.getElementById(boxId), img = document.getElementById(imgId);
    let isPanning = false, startX, startY, currentX = 0, currentY = 0;
    box.onclick = () => { img.classList.toggle('zoomed'); currentX = 0; currentY = 0; img.style.transform = img.classList.contains('zoomed') ? 'scale(3.5)' : 'scale(1)'; };
    box.addEventListener('touchstart', (e) => { if(!img.classList.contains('zoomed')) return; isPanning = true; startX = e.touches[0].clientX - currentX; startY = e.touches[0].clientY - currentY; });
    box.addEventListener('touchmove', (e) => { if(!isPanning) return; currentX = e.touches[0].clientX - startX; currentY = e.touches[0].clientY - startY; img.style.transform = `scale(3.5) translate(${currentX/3.5}px, ${currentY/3.5}px)`; });
    box.addEventListener('touchend', () => isPanning = false);
}

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div>
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <h3 style="margin-top:15px; color:#000;">${selectedCloth.name}</h3>
            <p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p>
            <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:20px; width:90%; border-radius:14px; font-weight:900; border:none; cursor:pointer; margin-top:10px;">Wear it! ✨</button>
        </div>`;
    initInspectionPan('preview-zoom-box', 'preview-img');
};

window.proceedToUpload = () => {
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="padding:20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900;">FINISH YOUR LOOK</h2>
            <p style="color:#666; font-weight:600; margin-bottom:25px;">Upload full photo showing head to toe</p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; border:none;">SELECT PHOTO</button>
        </div>`;
};

window.handleCustomerUpload = (e) => { const f = e.target.files[0]; if(!f) return; const rd = new FileReader(); rd.onload = (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; rd.readAsDataURL(f); };
window.buyNow = () => { const text = `Hello! I just tried on the *${selectedCloth.name}* and I love it! Price: ₦${selectedCloth.price.toLocaleString()}`; window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank'); };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; if(window.chatway){ window.chatway.hide(); window.chatway.close(); } };
window.showCart = () => { alert(cart.length > 0 ? `Items: ${cart.length}` : "Cart empty"); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function initGlobalUIStyles() { const s = document.createElement('style'); s.innerHTML = `.dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin 2s linear infinite; margin: 0 auto; } @keyframes spin { 100% { transform: rotate(360deg); } } #draggable-chat-head, #chat-close-zone { display: none !important; }`; document.head.appendChild(s); }
function initVoiceSearch() { const mic = document.getElementById('mic-btn'); if (!mic) return; const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) return; const rec = new Speech(); mic.onclick = () => { rec.start(); mic.style.color = "#e60023"; }; rec.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); }; }
function applyDynamicThemeStyles() { const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const el = document.getElementById('store-name-display'); if(el) el.style.color = isDark ? 'white' : 'black'; }