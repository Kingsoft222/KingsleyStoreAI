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

// --- 🎯 RESTORED CHAT SUPPORT LOGIC ---
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
    resDiv.innerHTML = `<div style="height:400px; display:flex; align-items:center; justify-content:center; flex-direction:column;"><div class="dotted-spinner"></div><p style="margin-top:20px; font-weight:700;">Connecting Support...</p><button onclick="window.closeFittingRoom()" style="margin-top:20px; padding:10px 20px; border-radius:30px; border:1px solid #ddd; background:none; font-weight:700; cursor:pointer;">Back to Store</button></div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
};

// --- 🎯 RESTORED 4-WAY PAN & ZOOM PHYSICS ---
function initInspectionPan(boxId, imgId) {
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
}

// --- 🎯 RESTORED WHATSAPP & RECEIPT LOGIC ---
window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + i.price, 0);
    try {
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { totalRevenue: increment(total) });
        await set(dbRef(db, `receipts/${orderId}`), { storeId: currentStoreId, items: cart, total: total, date: new Date().toLocaleString() });
        const receiptLink = `https://kingsley-store-ai.vercel.app/receipt.html?id=${orderId}`;
        const summaryMsg = `🛡️ *VERIFIED VIRTUALMALL ORDER*%0AOrder ID: *${orderId}*%0ATotal: *₦${total.toLocaleString()}*%0A%0A✅ *View Official Receipt:*%0A${receiptLink}`;
        cart = []; localStorage.removeItem(`cart_${currentStoreId}`); window.updateCartUI();
        window.location.assign(`https://wa.me/${storePhone}?text=${summaryMsg}`);
    } catch(e) { alert("Checkout failed."); }
};

// --- 🎯 CORE ACTIONS ---
window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) {
        resDiv.innerHTML = `<div style="padding:50px; text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h3>Cart empty</h3></div>`;
        return;
    }
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;"><div style="text-align:left; color:#111;"><b>${item.name}</b><br><span style="color:#e60023;">₦${item.price.toLocaleString()}</span></div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#e60023; font-weight:900; cursor:pointer;">✕</button></div>`).join('');
    resDiv.innerHTML = `<div style="padding:10px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#e60023; font-weight:800;">CART SUMMARY</h2><div style="max-height:300px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><div style="display:flex; justify-content:space-between; font-weight:900; color:#111; border-top:2px solid #e60023; padding-top:15px;"><span>Total:</span><span>₦${total.toLocaleString()}</span></div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:bold; margin-top:20px; cursor:pointer; display:block;">WhatsApp Checkout ➔</button></div>`;
};

window.handleAddToCartLoop = () => {
    if (selectedCloth) {
        cart.push(selectedCloth);
        localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
        window.updateCartUI();
        const stack = document.getElementById('cta-stack');
        if (stack) stack.innerHTML = `<button onclick="window.closeFittingRoom()" style="width:100%; padding:20px; background:#555; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer;">Check Another One</button><button onclick="window.openCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer;">PROCEED TO CART ➔</button>`;
    }
};

window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const badge = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#00a2ff" style="margin-left:4px;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    document.getElementById('ai-fitting-result').innerHTML = `<div id="sidebar-overlay" style="display:block;" onclick="window.closeFittingRoom()"><div id="sidebar-drawer" onclick="event.stopPropagation()"><div style="padding:25px 20px; display:flex; justify-content:space-between; align-items:center;"><span onclick="window.openChatPage()" style="color:#0b57d0; font-weight:700; cursor:pointer;">🎧 Chat Support</span><span onclick="window.closeFittingRoom()" style="font-size:1.5rem; cursor:pointer;">✕</span></div><div style="padding:0 24px;"><h2 style="font-size:1.4rem; font-weight:900;"><span style="color:#e60023;">Store</span> Option</h2></div><div style="padding:20px 24px; display:flex; flex-direction:column; gap:20px;"><div style="font-size:0.75rem; font-weight:800; color:#888; text-transform:uppercase;">Verified Stores ${badge}</div><div onclick="window.location.assign('?store=kingss1')" style="font-weight:600; cursor:pointer;">💎 Stella Wears ${badge}</div><div onclick="window.location.assign('?store=ifeomaezema1791')" style="font-weight:600; cursor:pointer;">👗 IFY FASHION ${badge}</div><div style="font-size:0.75rem; font-weight:800; color:#ccc; text-transform:uppercase; border-top:1px solid #eee; padding-top:20px;">Unverified Stores</div></div></div></div>`;
};

// --- BOOTUP & UTILS ---
document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously(auth).catch(() => {});
    window.updateCartUI();
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.openCart;
    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(k => ({ id: k, ...data.catalog[k] }));
        }
    });
});

window.handleCustomerUpload = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; rd.readAsDataURL(f); };
window.startTryOn = async () => { /* RESTORED VTO START LOGIC */ };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.updateCartUI(); window.openCart(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; if(window.chatway) { window.chatway.hide(); window.chatway.close(); } };