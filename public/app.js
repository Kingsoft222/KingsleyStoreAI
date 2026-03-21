import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref as dbRef, onValue, update, set, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// --- 🚀 FAST TRY-ON ENGINE (AUTOMATIC TRIGGER) ---
window.handleCustomerUpload = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    const reader = new FileReader(); 
    reader.onload = (ev) => { 
        localUserBase64 = ev.target.result; 
        window.startTryOn(); // ⚡ TRIGGERS PROCESSING AUTOMATICALLY
    }; 
    reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const storeName = document.getElementById('store-name-display').innerText;
    const firstName = storeName.split(' ')[0] || "Stella";
    
    // RESTORED SHOWROOM MODAL FEATURES
    resDiv.innerHTML = `
        <div style="text-align:center;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="color:#e60023; font-weight:900; margin:0;">${firstName}'s Showroom</h2>
            <p style="margin:20px 0; font-weight:800; color:#000; text-transform:uppercase; font-size:0.9rem;">STITCHING YOUR OUTFIT...</p>
            <div class="dotted-spinner"></div>
        </div>`;

    try {
        const img = new Image();
        img.src = localUserBase64;
        const optUser = await new Promise((resolve) => {
            img.onload = () => {
                const canvas = document.createElement('canvas'); const MAX_WIDTH = 768;
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
            };
        });

        const response = await fetch('/api/process-vto', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: optUser, clothImageUrl: selectedCloth.imgUrl, category: selectedCloth.category || "Native" })
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div style="text-align:center;">
                    <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                    <div class="zoom-container" id="result-zoom-box"><img src="data:image/png;base64,${result.image}" class="zoom-image" id="result-img"></div>
                    <button id="main-add-btn" onclick="window.handleAddToCartLoop()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer;">Add to Cart 🛍️</button>
                </div>`;
            initInspectionPan('result-zoom-box', 'result-img');
        } else { throw new Error(); }
    } catch (err) { resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#111;">Server Busy</h2><button onclick="window.proceedToUpload()" style="background:#111; color:white; padding:15px 30px; border-radius:12px; border:none;">RETRY</button></div>`; }
};

// --- 🎯 BOOTUP & STORE FRONT ADS ---
document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously(auth).catch(() => {});
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.openCart;
    document.querySelector('.send-circle').onclick = (e) => { e.preventDefault(); window.executeSearch(); };

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const input = document.getElementById('ai-input'); if (input) input.placeholder = data.searchHint || "Search style...";
            
            // PROFESSIONAL ADS (65px)
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4>🔥 ${data.label1 || 'Vintage'}</h4><p>Shop now</p></div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4>🔥 ${data.label2 || 'Senator'}</h4><p>Exclusive</p></div>`;
            }

            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            document.getElementById('dynamic-greeting').style.display = 'none'; 
            if (data.catalog) { storeCatalog = Object.keys(data.catalog).map(k => ({ id: k, ...data.catalog[k] })); }
            updateCartUI();
        }
    });
});

// Sidebar & Cart Utils
window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const badge = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#00a2ff" style="margin-left:4px;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    document.getElementById('ai-fitting-result').innerHTML = `<div id="sidebar-overlay" style="display:block;" onclick="window.closeFittingRoom()"><div id="sidebar-drawer" onclick="event.stopPropagation()"><div style="padding:25px 20px; display:flex; justify-content:space-between; align-items:center;"><span style="color:#0b57d0; font-weight:700;">🎧 Chat Support</span><span onclick="window.closeFittingRoom()" style="font-size:1.5rem; cursor:pointer;">✕</span></div><div style="padding:20px 24px; display:flex; flex-direction:column; gap:20px;"><div style="font-size:0.75rem; font-weight:800; color:#888; text-transform:uppercase;">Verified Stores ${badge}</div><div onclick="window.location.assign('?store=kingss1')" style="font-weight:600; cursor:pointer;">💎 Stella Wears ${badge}</div><div onclick="window.location.assign('?store=ifeomaezema1791')" style="font-weight:600; cursor:pointer;">👗 IFY FASHION ${badge}</div><div style="font-size:0.75rem; font-weight:800; color:#ccc; text-transform:uppercase; border-top:1px solid #eee; padding-top:20px;">Unverified Stores</div></div></div></div>`;
};

window.executeSearch = () => { const q = document.getElementById('ai-input').value.toLowerCase().trim(); const res = document.getElementById('ai-results'); if (!q) { res.style.display = 'none'; return; } const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q)); res.style.display = 'grid'; res.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4>${item.name}</h4><p>₦${item.price.toLocaleString()}</p></div>`).join(''); };
function initInspectionPan(boxId, imgId) { const box = document.getElementById(boxId), img = document.getElementById(imgId); let isPanning = false, startX, startY, currentX = 0, currentY = 0; box.onclick = () => { img.classList.toggle('zoomed'); currentX = 0; currentY = 0; img.style.transform = img.classList.contains('zoomed') ? 'scale(3.5)' : 'scale(1)'; }; box.addEventListener('touchstart', (e) => { if(!img.classList.contains('zoomed')) return; isPanning = true; startX = e.touches[0].clientX - currentX; startY = e.touches[0].clientY - currentY; }); box.addEventListener('touchmove', (e) => { if(!isPanning) return; currentX = e.touches[0].clientX - startX; currentY = e.touches[0].clientY - startY; img.style.transform = `scale(3.5) translate(${currentX/3.5}px, ${currentY/3.5}px)`; }); box.addEventListener('touchend', () => isPanning = false); }
window.promptShowroomChoice = (id) => { selectedCloth = storeCatalog.find(c => String(c.id) === String(id)); document.getElementById('fitting-room-modal').style.display = 'flex'; document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div><h3 style="color:#111; margin:0;">${selectedCloth.name}</h3><p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p><button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold;">Wear it! ✨</button></div>`; initInspectionPan('preview-zoom-box', 'preview-img'); };
window.proceedToUpload = () => { document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div style="font-size:3rem;">🤳</div><h2 style="color:#e60023;">FINISH YOUR LOOK</h2><input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" /><button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">SELECT PHOTO</button></div>`; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };