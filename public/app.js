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

// --- 🎯 THE FAST MACHINE (DO NOT TOUCH) ---
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

// --- 🎯 BUTTON & UI RESTORATION ---
document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    
    const menuIcon = document.getElementById('menu-icon');
    if (menuIcon) menuIcon.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    
    const cartIcon = document.getElementById('cart-icon-container');
    if (cartIcon) cartIcon.onclick = window.showCart;

    const sendBtn = document.querySelector('.send-circle');
    if (sendBtn) sendBtn.onclick = () => window.executeSearch();

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search...";
                searchInput.oninput = window.executeSearch;
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
    initVoiceSearch();
});

window.renderProducts = (items) => {
    const results = document.getElementById('ai-results');
    if (!results) return;
    results.style.display = 'grid';
    results.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')" style="cursor:pointer !important; pointer-events:auto !important;">
            <img src="${item.imgUrl}"><h4>${item.name}</h4><p>₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    if (!query) { document.getElementById('ai-results').style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => (c.name && c.name.toLowerCase().includes(query)));
    window.renderProducts(filtered);
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    if (!selectedCloth) return;
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="text-align:center; padding:5px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div>
            <h3 style="margin-top:15px; font-weight:800; color:#000;">${selectedCloth.name}</h3>
            <p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p>
            <button onclick="window.proceedToUpload()" id="wear-it-btn" style="background:#e60023; color:white; padding:20px; width:90%; border-radius:14px; font-weight:900; border:none; cursor:pointer; margin-top:10px; text-transform:uppercase;">Wear it! ✨</button>
        </div>`;
    initInspectionPan('preview-zoom-box', 'preview-img');
};

window.proceedToUpload = () => {
    document.getElementById('ai-fitting-result').innerHTML = `
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

window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-overlay" style="display: block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()" style="background:#fff; position:fixed; left:0; top:0; height:100%; width:300px; z-index:21000; overflow-y:auto; text-align:left; padding:20px;">
                <div style="padding:10px 0; font-size:1.4rem; font-weight:700; display:flex; justify-content:space-between; color:#111;"><span>Options</span><span onclick="window.closeFittingRoom()" style="cursor:pointer;">✕</span></div>
                <div style="color:#888; font-size:0.75rem; font-weight:700; text-transform:uppercase; border-top:1px solid #eee; padding-top:20px; margin-top:10px;">Luxury Wears</div>
                <div onclick="window.location.assign('?store=kingss1')" style="padding:15px 0; color:#111; font-weight:600;">Stella Wears</div>
                <div style="color:#888; font-size:0.75rem; font-weight:700; text-transform:uppercase; border-top:1px solid #eee; padding-top:20px; margin-top:10px;">Bespoke Fashion</div>
                <div onclick="window.location.assign('?store=adivichi')" style="padding:15px 0; color:#111; font-weight:600;">ADIVICHI FASHION</div>
            </div>
        </div>`;
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function initGlobalUIStyles() { const s = document.createElement('style'); s.innerHTML = `.dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin 2s linear infinite; margin: 0 auto; } @keyframes spin { 100% { transform: rotate(360deg); } } #sidebar-drawer { position: fixed; top: 0; left: -320px; width: 300px; height: 100%; background: #fff; z-index: 21000; transition: 0.3s; } #sidebar-drawer.open { left: 0; }`; document.head.appendChild(s); }
function initVoiceSearch() { const micBtn = document.getElementById('mic-btn'); if (!micBtn) return; const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRec) return; const recognition = new SpeechRec(); micBtn.onclick = () => { try { recognition.start(); micBtn.style.color = "#e60023"; } catch(e) {} }; recognition.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); }; }
function applyDynamicThemeStyles() { const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const el = document.getElementById('store-name-display'); if(el) el.style.color = isDark ? 'white' : 'black'; }