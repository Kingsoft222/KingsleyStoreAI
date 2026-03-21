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

// --- RESTORED ADD TO CART LOGIC ---
window.handleAddToCartLoop = () => {
    if (selectedCloth) {
        cart.push(selectedCloth);
        localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
        window.updateCartUI();
        
        const stack = document.getElementById('cta-stack') || document.querySelector('#ai-fitting-result div[style*="display:flex"]');
        if (stack) {
            stack.innerHTML = `
                <button onclick="window.closeFittingRoom()" style="width:100%; padding:20px; background:#555; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer;">Check Another One</button>
                <button onclick="window.openCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer;">PROCEED TO CART ➔</button>
            `;
        }
    }
};

window.updateCartUI = () => {
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.innerText = cart.length;
};

// --- CORE VTO ENGINE ---
window.handleCustomerUpload = (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    const reader = new FileReader(); 
    reader.onload = (ev) => { 
        localUserBase64 = ev.target.result; 
        window.startTryOn(); 
    }; 
    reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const storeName = document.getElementById('store-name-display')?.innerText || "Store";
    const firstName = storeName.split(' ')[0];
    
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
                    <div id="cta-stack" style="display:flex; flex-direction:column; gap:12px;">
                        <button id="main-add-btn" onclick="window.handleAddToCartLoop()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer;">Add to Cart 🛍️</button>
                    </div>
                </div>`;
            if (typeof initInspectionPan === 'function') initInspectionPan('result-zoom-box', 'result-img');
        } else { throw new Error(); }
    } catch (err) { resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#111;">Server Busy</h2><button onclick="window.proceedToUpload()" style="background:#111; color:white; padding:15px 30px; border-radius:12px; border:none;">RETRY</button></div>`; }
};

// --- BOOTUP ---
document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously(auth).catch(() => {});
    window.updateCartUI();
    
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.openCart;
    
    const sendBtn = document.querySelector('.send-circle');
    if (sendBtn) sendBtn.onclick = (e) => { e.preventDefault(); window.executeSearch(); };

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const input = document.getElementById('ai-input'); if (input) input.placeholder = data.searchHint || "Search style...";
            
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4>🔥 ${data.label1 || 'Vintage'}</h4><p>Shop now</p></div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4>🔥 ${data.label2 || 'Senator'}</h4><p>Exclusive</p></div>`;
            }
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(k => ({ id: k, ...data.catalog[k] }));
        }
    });
});

window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase().trim();
    const res = document.getElementById('ai-results');
    if (!q) { res.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q));
    res.style.display = 'grid';
    res.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4>${item.name}</h4><p>₦${item.price.toLocaleString()}</p></div>`).join('');
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div><h3 style="color:#111; margin:0;">${selectedCloth.name}</h3><p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p><button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">Wear it! ✨</button></div>`;
    if (typeof initInspectionPan === 'function') initInspectionPan('preview-zoom-box', 'preview-img');
};

window.proceedToUpload = () => {
    document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div style="font-size:3rem;">🤳</div><h2 style="color:#e60023;">FINISH YOUR LOOK</h2><input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" /><button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">SELECT PHOTO</button></div>`;
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };