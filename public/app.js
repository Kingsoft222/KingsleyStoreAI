import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref as dbRef, onValue, update, set, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// 🔥 Essential for "Return to Admin" to work across refreshes
setPersistence(auth, browserLocalPersistence);

const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let localUserBase64 = "", selectedCloth = null, storePhone = "2348000000000", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 

// --- 🎯 VOICE SEARCH (MIC) ---
const initVoiceSearch = () => {
    const micBtn = document.querySelector('.mic-icon');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!micBtn || !SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    micBtn.onclick = () => { micBtn.style.color = '#e60023'; recognition.start(); };
    recognition.onresult = (e) => {
        const t = e.results[0][0].transcript;
        const input = document.getElementById('ai-input');
        if (input) { input.value = t; window.executeSearch(); }
        micBtn.style.color = '#5f6368';
    };
    recognition.onerror = () => { micBtn.style.color = '#5f6368'; };
};

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
        <div style="height:400px; display:flex; align-items:center; justify-content:center; flex-direction:column;">
            <div class="dotted-spinner"></div>
            <p style="margin-top:20px; font-weight:700;">Connecting Support...</p>
            <button onclick="window.closeFittingRoom()" style="margin-top:20px; padding:12px 24px; border-radius:30px; border:1px solid #ddd; background:#f9f9f9; color:#111; font-weight:700; cursor:pointer;">Back to Store</button>
        </div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
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

// --- 🚀 VTO ENGINE & CHECKOUT ---
window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + i.price, 0);
    try {
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { totalRevenue: increment(total) });
        await set(dbRef(db, `receipts/${orderId}`), { storeId: currentStoreId, items: cart, total: total, date: new Date().toLocaleString() });
        const receiptLink = `https://kingsley-store-ai.vercel.app/receipt.html?id=${orderId}`;
        const summaryMsg = `🛡️ *VERIFIED ORDER*%0AOrder ID: *${orderId}*%0ATotal: *₦${total.toLocaleString()}*%0A%0A✅ *Receipt:* ${receiptLink}`;
        cart = []; localStorage.removeItem(`cart_${currentStoreId}`); window.updateCartUI();
        window.location.assign(`https://wa.me/${storePhone}?text=${summaryMsg}`);
    } catch(e) { alert("Checkout failed."); }
};

window.handleCustomerUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); };
    reader.readAsDataURL(file);
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><p>STITCHING OUTFIT...</p><div class="dotted-spinner"></div></div>`;
    try {
        const img = new Image(); img.src = localUserBase64;
        const optUser = await new Promise(r => { img.onload = () => { const c = document.createElement('canvas'); const MAX = 768; let w = img.width, h = img.height; if(w > MAX){ h *= MAX/w; w = MAX; } c.width = w; c.height = h; c.getContext('2d').drawImage(img,0,0,w,h); r(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; });
        const resp = await fetch('/api/process-vto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userImage: optUser, clothImageUrl: selectedCloth.imgUrl, category: selectedCloth.category || "Native" }) });
        const res = await resp.json();
        if (res.success) {
            resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="zoom-container" id="res-box"><img src="data:image/png;base64,${res.image}" class="zoom-image" id="res-img"></div><button onclick="window.handleAddToCartLoop()" class="btn-primary">Add to Cart 🛍️</button></div>`;
            window.initInspectionPan('res-box', 'res-img');
        }
    } catch (e) { alert("Try-on failed"); }
};

// --- 🎯 BOOTUP & DATA ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => { if (!user) signInAnonymously(auth); });
    window.updateCartUI();
    initVoiceSearch();
    document.getElementById('menu-icon').onclick = window.openOptionsMenu;
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

// --- 🎯 SIDEBAR & UTILS ---
window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const badge = `<svg viewBox="0 0 24 24" width="14" height="14" fill="#00a2ff" style="margin-left:4px; vertical-align:middle;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-drawer" style="width:280px; height:100%; background:#fff; position:fixed; left:0; top:0; z-index:10001; padding:20px; box-shadow:2px 0 10px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <span onclick="window.openChatPage()" style="color:#0b57d0; font-weight:700; cursor:pointer;">🎧 Chat Support</span>
                <span onclick="window.closeFittingRoom()" style="font-size:1.5rem; cursor:pointer;">✕</span>
            </div>
            <h2 style="font-weight:900;"><span style="color:#e60023;">Mall</span> Navigator</h2>
            <div style="display:flex; flex-direction:column; gap:20px; margin-top:30px;">
                <div>
                    <p style="font-size:0.7rem; color:#888; text-transform:uppercase; font-weight:800;">Street Wears</p>
                    <div onclick="window.location.assign('?store=ifeomaezema1791')" style="cursor:pointer; margin-top:10px;">👗 Ify Fashion ${badge}</div>
                    <div onclick="window.location.assign('?store=kingss1')" style="cursor:pointer; margin-top:10px;">💎 Stella Wears ${badge}</div>
                </div>
                <div>
                    <p style="font-size:0.7rem; color:#888; text-transform:uppercase; font-weight:800;">Luxury Native</p>
                    <div onclick="window.location.assign('?store=adivichi')" style="cursor:pointer; margin-top:10px;">🧵 Adivici Fashion ${badge}</div>
                    <div onclick="window.location.assign('?store=thomasmongim')" style="cursor:pointer; margin-top:10px;">👕 Thomas Mongi ${badge}</div>
                </div>
                <div style="border-top:1px solid #eee; padding-top:20px;">
                    <p style="font-size:0.7rem; color:#888; text-transform:uppercase; font-weight:800;">Unverified Stores</p>
                    <div onclick="window.location.assign('?store=johnsonclothing')" style="cursor:pointer; margin-top:10px;">🏪 Johnson Clothing Line</div>
                    <div onclick="window.location.assign('?store=johnsonsneakers')" style="cursor:pointer; margin-top:10px;">🏪 Johnson Sneakers</div>
                </div>
                <div id="admin-sidebar-link" style="display:none; margin-top:20px; border-top:2px dashed #eee; padding-top:20px;">
                    <div onclick="window.location.href='admin.html'" style="color:#e60023; font-weight:800; cursor:pointer; background:#fff5f5; padding:12px; border-radius:10px;">
                        <i class="fas fa-arrow-left"></i> RETURN TO ADMIN
                    </div>
                </div>
            </div>
        </div>`;
    
    // 🔥 Check owner identity to show button
    onAuthStateChanged(auth, (user) => {
        const link = document.getElementById('admin-sidebar-link');
        if (link && user && user.email === window.currentStoreOwnerEmail) link.style.display = 'block';
    });
};

window.executeSearch = () => { 
    const q = document.getElementById('ai-input').value.toLowerCase().trim(); 
    const res = document.getElementById('ai-results'); 
    if (!q) { res.style.display = 'none'; return; } 
    const filt = storeCatalog.filter(c => c.name.toLowerCase().includes(q)); 
    res.style.display = 'grid'; 
    res.innerHTML = filt.map(i => `<div class="result-card" onclick="window.promptShowroomChoice('${i.id}')"><img src="${i.imgUrl}"><h4>${i.name}</h4><p>₦${i.price.toLocaleString()}</p></div>`).join(''); 
};

window.openCart = () => { /* Logic as is */ };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };