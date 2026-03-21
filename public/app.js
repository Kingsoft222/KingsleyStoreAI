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
let windowActiveGreetings = [], gIndex = 0;

// --- 🎯 CORE LOAD LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.openCart;
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
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label1 || 'Luxury'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Shop exclusive wear</p>
                    </div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label2 || 'Bespoke'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Perfect styles for you</p>
                    </div>`;
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
            updateCartUI();
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && windowActiveGreetings.length > 1) { 
            gIndex++;
            el.innerText = windowActiveGreetings[gIndex % windowActiveGreetings.length]; 
        }
    }, 4000);
    initVoiceSearch();
});

// --- 🎯 PROCESSING PAGE Restoration ---
window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const fullStoreName = document.getElementById('store-name-display').innerText;
    const firstName = fullStoreName.split(' ')[0] || "Stella";
    
    resDiv.innerHTML = `
        <div style="text-align:center;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:5px;">${firstName}'s Showroom</h2>
            <p style="margin-bottom:30px; font-weight:800; color:#000; text-transform:uppercase; font-size:0.9rem;">STITCHING YOUR OUTFIT...</p>
            <div class="dotted-spinner"></div>
        </div>`;

    try {
        const optUser = await optimizeForAI(localUserBase64);
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: optUser, clothImage: rawCloth, category: selectedCloth.category || "Native" })
        });
        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div style="text-align:center;">
                    <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                    <img src="data:image/png;base64,${result.image}" style="width:100%; border-radius:20px; margin-bottom:20px;">
                    <button onclick="window.addToCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer;">Add to Cart 🛍️</button>
                </div>`;
        } else { throw new Error(); }
    } catch (err) { resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#111;">Server error</h2><button onclick="window.proceedToUpload()" style="background:#111; color:white; padding:15px 30px; border-radius:12px; border:none;">RETRY</button></div>`; }
};

// --- 🎯 EXTRACTED CHECKOUT & CART LOGIC ---
window.addToCart = () => {
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI(); 
    window.openCart();
};

window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + i.price, 0);
    const orderDate = new Date().toLocaleString();

    try {
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { totalRevenue: increment(total) });
        await set(dbRef(db, `receipts/${orderId}`), { storeId: currentStoreId, items: cart, total: total, date: orderDate });

        const receiptLink = `${window.location.origin}/receipt.html?id=${orderId}`;
        const summaryMsg = `🛡️ *VERIFIED VIRTUALMALL ORDER*%0AOrder ID: *${orderId}*%0ATotal: *₦${total.toLocaleString()}*%0A%0A✅ *View Official Receipt:*%0A${receiptLink}`;
        
        cart = []; localStorage.removeItem(`cart_${currentStoreId}`); updateCartUI();
        window.location.assign(`https://wa.me/${storePhone}?text=${summaryMsg}`);
    } catch(e) { alert("Sync failed."); }
};

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) { resDiv.innerHTML = `<div style="padding:40px; text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h3>Cart is empty</h3></div>`; return; }
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;"><div style="text-align:left; color:#111;"><b>${item.name}</b><br>₦${item.price.toLocaleString()}</div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:red; font-size:1.2rem;">✕</button></div>`).join('');
    resDiv.innerHTML = `<div style="padding:10px;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#e60023; font-weight:800;">CART SUMMARY</h2><div style="max-height:300px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div><div style="display:flex; justify-content:space-between; font-weight:900; color:#111; border-top:2px solid #e60023; padding-top:15px;"><span>Total:</span><span>₦${total.toLocaleString()}</span></div><button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:bold; margin-top:20px;">Checkout via WhatsApp</button></div>`;
};

// --- 🎯 UTILITIES & UI HELPERS ---
window.openChatPage = () => {
    const s = document.createElement("script"); s.src = "https://cdn.chatway.app/widget.js?id=govCX46EKb8v"; document.head.appendChild(s);
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div style="height:350px; display:flex; align-items:center; justify-content:center; flex-direction:column;"><div class="dotted-spinner"></div><p style="color:#111; margin-top:20px;">Launching Support...</p><button onclick="window.closeFittingRoom()" style="margin-top:20px; padding:10px 25px; border-radius:30px; border:1px solid #ddd; background:none; font-weight:700; color:#333;">Return to Store</button></div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
};

window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase().trim();
    const res = document.getElementById('ai-results');
    if (!q) { res.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q));
    res.style.display = 'grid';
    res.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4>${item.name}</h4><p>₦${item.price.toLocaleString()}</p></div>`).join('');
};

async function optimizeForAI(b64) { return new Promise((res) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 768; let w = img.width, h = img.height; if (w > MAX) { h *= MAX/w; w = MAX; } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); res(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]); }; img.src = b64; }); }
async function getBase64FromUrl(url) { return new Promise((resolve) => { fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`).then(r => r.blob()).then(b => { const rd = new FileReader(); rd.onloadend = () => resolve(rd.result.split(',')[1]); rd.readAsDataURL(b); }); }); }
window.promptShowroomChoice = (id) => { selectedCloth = storeCatalog.find(c => String(c.id) === String(id)); document.getElementById('fitting-room-modal').style.display = 'flex'; document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="${selectedCloth.imgUrl}" style="width:100%; border-radius:20px;"><h3 style="color:#111;">${selectedCloth.name}</h3><button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold;">Wear it! ✨</button></div>`; };
window.proceedToUpload = () => { document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div style="font-size:3rem;">🤳</div><h2 style="color:#e60023;">FINISH YOUR LOOK</h2><input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" /><button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:18px; width:100%; border-radius:14px; font-weight:bold;">SELECT PHOTO</button></div>`; };
window.handleCustomerUpload = (e) => { const f = e.target.files[0]; const rd = new FileReader(); rd.onload = (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; rd.readAsDataURL(f); };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; if(window.chatway){ window.chatway.hide(); window.chatway.close(); } };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function initGlobalUIStyles() { const s = document.createElement('style'); s.innerHTML = `#draggable-chat-head, #chat-close-zone { display: none !important; }`; document.head.appendChild(s); }
function initVoiceSearch() { const mic = document.getElementById('mic-btn'); const Sp = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Sp || !mic) return; const rec = new Sp(); mic.onclick = () => rec.start(); rec.onresult = (e) => { document.getElementById('ai-input').value = e.results[0][0].transcript; window.executeSearch(); }; }
function applyDynamicThemeStyles() { const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches; document.getElementById('store-name-display').style.color = isDark ? 'white' : 'black'; }