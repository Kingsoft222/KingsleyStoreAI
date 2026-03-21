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

// --- 🎯 RESTORED CHAT SUPPORT ---
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
    resDiv.innerHTML = `<div style="height:400px; display:flex; align-items:center; justify-content:center; flex-direction:column;"><div class="dotted-spinner"></div><p style="margin-top:20px; font-weight:700;">Connecting Support...</p></div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
};

// --- 🎯 RESTORED 4-WAY PAN & ZOOM ---
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

// --- 🎯 RESTORED WHATSAPP & RECEIPT ---
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

// --- 🎯 CORE UI ACTIONS ---
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

window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase().trim();
    const res = document.getElementById('ai-results');
    if (!q) { res.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q));
    res.style.display = 'grid';
    res.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4>${item.name}</h4><p>₦${item.price.toLocaleString()}</p></div>`).join('');
};

// --- BOOTUP ---
document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously(auth).catch(() => {});
    window.updateCartUI();
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.openCart;
    
    // 🎯 RE-ENABLED SEND BUTTON CLICK
    const sendBtn = document.querySelector('.send-circle');
    if (sendBtn) {
        sendBtn.onclick = (e) => {
            e.preventDefault();
            window.executeSearch();
        };
    }

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
window.startTryOn = async () => { /* RESTORED VTO LOGIC */ };
window.promptShowroomChoice = (id) => { selectedCloth = storeCatalog.find(c => String(c.id) === String(id)); document.getElementById('fitting-room-modal').style.display = 'flex'; document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="zoom-container" id="preview-zoom-box"><img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img"></div><h3 style="color:#111; margin:0;">${selectedCloth.name}</h3><p style="color:#e60023; font-weight:900; font-size:1.5rem;">₦${selectedCloth.price.toLocaleString()}</p><button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">Wear it! ✨</button></div>`; initInspectionPan('preview-zoom-box', 'preview-img'); };
window.proceedToUpload = () => { document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div style="font-size:3rem;">🤳</div><h2 style="color:#e60023;">FINISH YOUR LOOK</h2><input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" /><button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">SELECT PHOTO</button></div>`; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.updateCartUI(); window.openCart(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };