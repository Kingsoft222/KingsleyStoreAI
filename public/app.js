import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref as dbRef, onValue, update, set, increment, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    setPersistence, 
    browserLocalPersistence 
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
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let localUserBase64 = "", selectedCloth = null, storePhone = "2348000000000", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 

// --- 🎯 CHAT SUPPORT LOGIC ---
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
        <div style="height:400px; display:flex; align-items:center; justify-content:center; flex-direction:column; background:white; border-radius:20px;">
            <div class="dotted-spinner"></div>
            <p style="margin-top:20px; font-weight:700; color:#111;">Connecting Support...</p>
            <button onclick="window.closeFittingRoom()" style="margin-top:20px; padding:12px 24px; border-radius:30px; border:1px solid #ddd; background:#f9f9f9; color:#111; font-weight:700; cursor:pointer;">Back to Store</button>
        </div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
};

// --- 🎯 VOICE SEARCH ---
const initVoiceSearch = () => {
    const micBtn = document.querySelector('.mic-icon');
    const SpeechRecognition = window.Recognition || window.webkitSpeechRecognition;
    if (!micBtn || !SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    micBtn.onclick = () => { micBtn.style.color = '#e60023'; recognition.start(); };
    recognition.onresult = (e) => {
        const t = e.results[0][0].transcript;
        const input = document.getElementById('ai-input');
        if (input) { input.value = t; window.executeSearch(); }
        micBtn.style.color = '#5f6368';
    };
    recognition.onerror = () => { micBtn.style.color = '#5f6368'; };
};

// --- 🎯 4-WAY PAN & ZOOM PHYSICS ---
window.initInspectionPan = (boxId, imgId) => {
    const box = document.getElementById(boxId);
    const img = document.getElementById(imgId);
    if (!box || !img) return;
    let isPanning = false, startX, startY, currentX = 0, currentY = 0;
    box.onclick = () => {
        img.classList.toggle('zoomed');
        currentX = 0; currentY = 0;
        img.style.transform = img.classList.contains('zoomed') ? 'scale(3.5)' : 'scale(1)';
    };
    box.addEventListener('touchstart', (e) => {
        if (!img.classList.contains('zoomed')) return;
        isPanning = true;
        startX = e.touches[0].clientX - currentX;
        startY = e.touches[0].clientY - currentY;
    });
    box.addEventListener('touchmove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        currentX = e.touches[0].clientX - startX;
        currentY = e.touches[0].clientY - startY;
        img.style.transform = `scale(3.5) translate(${currentX / 3.5}px, ${currentY / 3.5}px)`;
    }, { passive: false });
    box.addEventListener('touchend', () => isPanning = false);
};

// --- 🎯 WHATSAPP CHECKOUT ---
window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + i.price, 0);
    try {
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { totalRevenue: increment(total) });
        await set(dbRef(db, `receipts/${orderId}`), { storeId: currentStoreId, items: cart, total: total, date: new Date().toLocaleString() });
        const receiptLink = `https://kingsley-store-ai.vercel.app/receipt.html?id=${orderId}`;
        const summaryMsg = `🛡️ *VERIFIED Order*%0AOrder ID: *${orderId}*%0ATotal: *₦${total.toLocaleString()}*%0A%0A✅ *Receipt:* ${receiptLink}`;
        cart = []; localStorage.removeItem(`cart_${currentStoreId}`); window.updateCartUI();
        window.location.assign(`https://wa.me/${storePhone}?text=${summaryMsg}`);
    } catch(e) { alert("Checkout failed."); }
};

// --- 🚀 VTO ENGINE ---
window.handleCustomerUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); };
    reader.readAsDataURL(file);
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const storeName = document.getElementById('store-name-display')?.innerText || "Store";
    const vendorFirstName = storeName.split(' ')[0];
    resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#e60023; font-weight:900; margin:0;">${vendorFirstName}'s Showroom</h2><p style="margin:20px 0; font-weight:800; color:#e60023; text-transform:uppercase; font-size:0.8rem;">STITCHING YOUR OUTFIT...</p><div class="dotted-spinner"></div></div>`;
    try {
       const img = new Image(); img.src = localUserBase64;
        const optUser = await new Promise(r => { img.onload = () => { const c = document.createElement('canvas'); const MAX = 768; let w = img.width, h = img.height; if(w > MAX){ h *= MAX/w; w = MAX; } c.width = w; c.height = h; c.getContext('2d').drawImage(img,0,0,w,h); r(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; });
        
        // --- 🎯 Force Product Priority ---
        let finalCategory = (selectedCloth.category || "DRESS").toUpperCase();
        const clothName = (selectedCloth.name || "").toLowerCase();
        if (clothName.includes("gown") || clothName.includes("dress") || clothName.includes("suit")) {
            finalCategory = "DRESS";
        }

        const resp = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ userImage: optUser, clothImageUrl: selectedCloth.imgUrl, category: finalCategory }) 
        });
        const res = await resp.json();
        if (res.success) {
            resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="zoom-container" id="res-box"><img src="data:image/png;base64,${res.image}" class="zoom-image" id="res-img"></div><div id="cta-stack" style="display:flex; flex-direction:column; gap:12px;"><button onclick="window.handleAddToCartLoop()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer;">Add to Cart 🛍️</button></div></div>`;
            window.initInspectionPan('res-box', 'res-img');
        }
    } catch (e) { resDiv.innerHTML = `<h2 style="color:#111;">Server Busy</h2>`; }
};

// --- 🎯 BOOTUP & DATA ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => { 
        if (!user) signInAnonymously(auth); 
        else if (!user.isAnonymous) {
            const userRef = dbRef(db, `users/${user.uid}`);
            const snap = await get(userRef);
            if (!snap.exists()) await set(userRef, { email: user.email, lastLogin: Date.now(), role: 'vendor' });
            else await update(userRef, { lastLogin: Date.now() });
        }
    });

    window.updateCartUI();
    initVoiceSearch();
    //document.getElementById('menu-icon').onclick = window.openOptionsMenu;
    document.getElementById('cart-icon-container').onclick = window.openCart;
    const sendBtn = document.querySelector('.send-circle');
    if (sendBtn) sendBtn.onclick = window.executeSearch;

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            window.currentStoreOwnerEmail = data.ownerEmail;
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const input = document.getElementById('ai-input'); 
            if (input) input.placeholder = data.searchHint || "Search style...";
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            const ads = document.getElementById('quick-search-container');
            if (ads) ads.innerHTML = `<div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4>🔥 ${data.label1}</h4></div><div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4>🔥 ${data.label2}</h4></div>`;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(k => ({ id: k, ...data.catalog[k] }));
        }
    });
});

// --- 🎯 SIDEBAR NAVIGATOR (FIXED UI & ADMIN BUTTON) ---
window.openOptionsMenu = () => {
    // We do NOT open 'fitting-room-modal' here to avoid the white background blocking the store
    const badge = `<svg viewBox="0 0 24 24" width="14" height="14" fill="#00a2ff" style="margin-left:4px; vertical-align:middle;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    
    let drawerContainer = document.getElementById('sidebar-wrapper');
    if (!drawerContainer) {
        drawerContainer = document.createElement('div');
        drawerContainer.id = 'sidebar-wrapper';
        document.body.appendChild(drawerContainer);
    }

    drawerContainer.innerHTML = `
        <div id="sidebar-drawer" style="width:280px; height:100%; background:#ffffff; position:fixed; left:0; top:0; z-index:10001; padding:20px; box-shadow:2px 0 10px rgba(0,0,0,0.1); color: #111; animation: slideIn 0.3s ease-out; overflow-y: auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <span onclick="window.openChatPage()" style="color:#0b57d0; font-weight:700; cursor:pointer; font-size:0.9rem;">🎧 Chat Support</span>
                <span onclick="document.getElementById('sidebar-wrapper').innerHTML=''" style="font-size:1.5rem; cursor:pointer; color: #111;">✕</span>
            </div>
            <h2 style="font-weight:900; margin:0; color:#111;"><span style="color:#e60023;">Mall</span> Navigator</h2>
            <div style="display:flex; flex-direction:column; gap:25px; margin-top:35px;">
                <div>
                    <p style="font-size:0.7rem; color:#888; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; margin-bottom:12px;">Street Wears</p>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div onclick="window.location.assign('?store=ifeomaezema1791')" style="cursor:pointer; font-weight:600; color:#111;">👗 Ify Fashion ${badge}</div>
                        <div onclick="window.location.assign('?store=kingss1')" style="cursor:pointer; font-weight:600; color:#111;">💎 Stella Wears ${badge}</div>
                    </div>
                </div>
                <div>
                    <p style="font-size:0.7rem; color:#888; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; margin-bottom:12px;">Luxury Native</p>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div onclick="window.location.assign('?store=adivichi')" style="cursor:pointer; font-weight:600; color:#111;">🧵 Adivici Fashion ${badge}</div>
                        <div onclick="window.location.assign('?store=thomasmongim')" style="cursor:pointer; font-weight:600; color:#111;">👕 Tommy Best ${badge}</div>
                    </div>
                </div>
                <div style="border-top:1px solid #eee; padding-top:20px;">
                    <p style="font-size:0.7rem; color:#888; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; margin-bottom:12px;">Unverified Stores</p>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div onclick="window.location.assign('?store=johnsonclothing')" style="cursor:pointer; font-weight:500; color:#111;">🏪 Johnson Clothing Line</div>
                        <div onclick="window.location.assign('?store=johnsonsneakers')" style="cursor:pointer; font-weight:500; color:#111;">🏪 Johnson Sneakers</div>
                    </div>
                </div>
                
                <div id="admin-sidebar-link" style="display:none; margin-top:10px; border-top:2px dashed #f5f5f5; padding-top:20px;">
                    <div onclick="window.location.href='admin.html'" style="display:flex; align-items:center; gap:10px; color:#e60023; font-weight:800; cursor:pointer; background:#fff5f5; padding:12px; border-radius:12px; font-size:0.9rem;">
                        <i class="fas fa-arrow-left"></i> RETURN TO ADMIN
                    </div>
                </div>
            </div>
            <div style="margin-top:40px; text-align:center; color:#ccc; font-size:0.65rem; font-weight:700; letter-spacing:1px;">VIRTUALMALL © 2026</div>
        </div>
        <style>
            @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        </style>`;

    // --- 🛡️ Restoring Admin Logic ---
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        const link = document.getElementById('admin-sidebar-link');
        if (link && user && !user.isAnonymous && user.email === window.currentStoreOwnerEmail) {
            link.style.display = 'block';
        }
    });
};

// --- 🎯 UTILITIES ---
window.executeSearch = () => { 
    const q = document.getElementById('ai-input').value.toLowerCase().trim(); 
    const res = document.getElementById('ai-results'); 
    if (!q) { res.style.display = 'none'; return; } 
    const filt = storeCatalog.filter(c => c.name.toLowerCase().includes(q)); 
    res.style.display = 'grid'; 
    res.innerHTML = filt.map(i => `<div class="result-card" onclick="window.promptShowroomChoice('${i.id}')"><img src="${i.imgUrl}"><h4>${i.name}</h4><p>₦${i.price.toLocaleString()}</p></div>`).join(''); 
};

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) { resDiv.innerHTML = `<div style="padding:50px; text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h3>Cart empty</h3></div>`; return; }
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;"><div style="text-align:left; color:#111;"><b>${item.name}</b><br><span style="color:#e60023;">₦${item.price.toLocaleString()}</span></div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#e60023; font-weight:900; cursor:pointer;">✕</button></div>`).join('');
    resDiv.innerHTML = `<div style="padding:10px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#e60023; font-weight:800;">CART SUMMARY</h2><div style="max-height:300px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><div style="display:flex; justify-content:space-between; font-weight:900; color:#111; border-top:2px solid #e60023; padding-top:15px;"><span>Total:</span><span>₦${total.toLocaleString()}</span></div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:bold; margin-top:20px; cursor:pointer; display:block;">WhatsApp Checkout ➔</button></div>`;
};

window.handleAddToCartLoop = () => { if (selectedCloth) { cart.push(selectedCloth); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.updateCartUI(); const s = document.getElementById('cta-stack'); if (s) s.innerHTML = `<button onclick="window.closeFittingRoom()" style="width:100%; padding:20px; background:#555; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer;">Check Another One</button><button onclick="window.openCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer;">PROCEED TO CART ➔</button>`; } };
window.promptShowroomChoice = (id) => { selectedCloth = storeCatalog.find(c => String(c.id) === String(id)); document.getElementById('fitting-room-modal').style.display = 'flex'; document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="zoom-container" id="pre-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="pre-img"></div><h3 style="color:#111; margin:0;">${selectedCloth.name}</h3><p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p><button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">Wear it! ✨</button></div>`; window.initInspectionPan('pre-box', 'pre-img'); };
window.proceedToUpload = () => { document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div style="font-size:3rem;">🤳</div><h2 style="color:#e60023;">FINISH YOUR LOOK</h2><input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" /><button onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">SELECT PHOTO</button></div>`; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; if(window.chatway) { window.chatway.hide(); window.chatway.close(); } };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.updateCartUI(); window.openCart(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };