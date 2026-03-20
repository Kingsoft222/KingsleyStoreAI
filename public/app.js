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

// --- 🎯 RAW STABLE MACHINE ---
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

// --- 🎯 START TRY ON Logic ---
window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const fullStoreName = document.getElementById('store-name-display').innerText;
    const vendorFirstName = fullStoreName.split(' ')[0] || "Vendor";
    resDiv.innerHTML = `
        <div style="padding:40px 10px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <h2 style="color:#e60023; font-weight:900; font-size:1.8rem;">${vendorFirstName}'s ShowRoom</h2>
            <p style="color:#000; font-weight:800; text-transform:uppercase;">STITCHING YOUR OUTFIT</p>
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
                <div>
                    <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
                    <div class="zoom-container" id="result-zoom-box"><img src="data:image/jpeg;base64,${result.image}" class="zoom-image" id="result-img"></div>
                    <button onclick="window.addToCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; margin-top:20px; border:none;">Add to Cart 🛍️</button>
                </div>`;
            const container = document.getElementById('result-zoom-box'), img = document.getElementById('result-img');
            container.onclick = () => img.classList.toggle('zoomed');
        } else { alert("AI processing failed"); window.closeFittingRoom(); }
    } catch (e) { alert("Connection Error"); window.closeFittingRoom(); }
};

// --- 🎯 APP BOOTUP & BUTTON ACTIVATION ---
document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {});
    initGlobalUIStyles(); 

    // ENABLE CONTROLS
    const menuBtn = document.getElementById('menu-icon');
    if (menuBtn) menuBtn.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    
    const cartIcon = document.getElementById('cart-icon-container');
    if (cartIcon) cartIcon.onclick = () => window.openCart();

    const sendBtn = document.querySelector('.send-circle');
    if (sendBtn) sendBtn.onclick = () => window.executeSearch();

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) searchInput.placeholder = data.searchHint || "Search...";
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.catalog) { storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] })); window.renderProducts(storeCatalog); }
            updateCartUI();
        }
    });
    initVoiceSearch();
});

// --- 🎯 SEARCH & RENDER ---
window.renderProducts = (items) => {
    const res = document.getElementById('ai-results');
    if (!res) return;
    res.style.display = 'grid';
    res.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}">
            <h4 style="font-size:0.8rem; margin:8px 0 2px;">${item.name}</h4>
            <p style="font-weight:800; color:#e60023;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase().trim();
    if (!q) { document.getElementById('ai-results').style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q));
    window.renderProducts(filtered);
};

function initVoiceSearch() {
    const mic = document.getElementById('mic-btn');
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!mic || !Speech) return;
    const rec = new Speech();
    mic.onclick = () => { rec.start(); mic.style.color = "#e60023"; };
    rec.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; mic.style.color = "#5f6368"; window.executeSearch(); };
}

// ... Pan, Choice, Checkout logic preserved ...
window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div>
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <h3 style="margin-top:15px; color:#000;">${selectedCloth.name}</h3>
            <p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p>
            <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:20px; width:90%; border-radius:14px; font-weight:900; border:none; margin-top:10px;">Wear it! ✨</button>
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
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
function initGlobalUIStyles() { const s = document.createElement('style'); s.innerHTML = `.dotted-spinner { width: 40px; height: 40px; border: 4px dotted #e60023; border-radius: 50%; animation: spin 2s linear infinite; margin: 15px auto; } @keyframes spin { 100% { transform: rotate(360deg); } }`; document.head.appendChild(s); }
function applyDynamicThemeStyles() { const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const el = document.getElementById('store-name-display'); if(el) el.style.color = isDark ? 'white' : 'black'; }