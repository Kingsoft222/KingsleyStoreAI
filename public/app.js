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

// 🔥 SSO Persistence: Essential for the "Return to Admin" button to recognize you
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
    resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#e60023; font-weight:900; margin:0;">${storeName.split(' ')[0]}'s Showroom</h2><p style="margin:20px 0; font-weight:800; color:#000; text-transform:uppercase; font-size:0.8rem;">STITCHING YOUR OUTFIT...</p><div class="dotted-spinner"></div></div>`;
    try {
        const img = new Image(); img.src = localUserBase64;
        const optUser = await new Promise(r => { img.onload = () => { const c = document.createElement('canvas'); const MAX = 768; let w = img.width, h = img.height; if(w > MAX){ h *= MAX/w; w = MAX; } c.width = w; c.height = h; c.getContext('2d').drawImage(img,0,0,w,h); r(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; });
        const resp = await fetch('/api/process-vto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userImage: optUser, clothImageUrl: selectedCloth.imgUrl, category: selectedCloth.category || "Native" }) });
        const res = await resp.json();
        if (res.success) {
            resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div class="zoom-container" id="res-box"><img src="data:image/png;base64,${res.image}" class="zoom-image" id="res-img"></div><div id="cta-stack" style="display:flex; flex-direction:column; gap:12px;"><button onclick="window.handleAddToCartLoop()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer;">Add to Cart 🛍️</button></div></div>`;
            window.initInspectionPan('res-box', 'res-img');
        } else throw new Error();
    } catch (e) { resDiv.innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h2 style="color:#111;">Server Busy</h2><button onclick="window.proceedToUpload()" style="background:#111; color:white; padding:15px 30px; border-radius:12px; border:none;">RETRY</button></div>`; }
};

// --- 🎯 BOOTUP ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            signInAnonymously(auth).catch(() => {});
        }
    });

    window.updateCartUI();
    initVoiceSearch();
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.openCart;
    
    // 🔥 RESTORED SEARCH ICON CLICK LOGIC
    const sendBtn = document.querySelector('.send-circle');
    if (sendBtn) {
        sendBtn.style.cursor = "pointer";
        sendBtn.onclick = (e) => { 
            e.preventDefault(); 
            window.executeSearch(); 
        };
    }

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // 🔥 CAPTURE OWNER EMAIL
            window.currentStoreOwnerEmail = data.ownerEmail;
            
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const input = document.getElementById('ai-input'); 
            if (input) input.placeholder = data.searchHint || "Search style...";
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            const ads = document.getElementById('quick-search-container');
            if (ads) ads.innerHTML = `<div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4>🔥 ${data.label1}</h4><p>Shop now</p></div><div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4>🔥 ${data.label2}</h4><p>Exclusive</p></div>`;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(k => ({ id: k, ...data.catalog[k] }));

            // 🔥 DYNAMIC REVEAL: Check identity right here after data is ready
            onAuthStateChanged(auth, (user) => {
                const adminLink = document.getElementById('admin-sidebar-link');
                if (adminLink && user && !user.isAnonymous && user.email === data.ownerEmail) {
                    adminLink.style.display = 'block';
                }
            });
        }
    });
});

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
window.proceedToUpload = () => { document.getElementById('ai-fitting-result').innerHTML = `<div style="text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><div style="font-size:3rem;">🤳</div><h2 style="color:#e60023;">FINISH YOUR LOOK</h2><input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" /><button onclick="document.getElementById('temp-tryon-input').click()" style="background:#111; color:white; padding:18px; width:100%; border-radius:14px; border:none; font-weight:bold; cursor:pointer;">SELECT PHOTO</button></div>`; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.updateCartUI(); window.openCart(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };

// --- 🎯 SIDEBAR NAVIGATOR ---
window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const badge = `<svg viewBox="0 0 24 24" width="14" height="14" fill="#00a2ff" style="margin-left:4px; vertical-align:middle;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-overlay" style="display:block; background:rgba(0,0,0,0.6); width:100%; height:100%; position:fixed; top:0; left:0; z-index:9999;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" style="width:280px; height:100%; background:#ffffff; position:absolute; left:0; top:0; color:#111; overflow-y:auto; box-shadow: 2px 0 10px rgba(0,0,0,0.1);" onclick="event.stopPropagation()">
                
                <div style="padding:25px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee;">
                    <span onclick="window.openChatPage()" style="color:#0b57d0; font-weight:700; cursor:pointer;">🎧 Chat Support</span>
                    <span onclick="window.closeFittingRoom()" style="font-size:1.5rem; cursor:pointer; color:#111;">✕</span>
                </div>
                
                <div style="padding:20px 24px;"><h2 style="font-size:1.2rem; font-weight:900; color:#111; margin:0;"><span style="color:#e60023;">Mall</span> Navigator</h2></div>
                
                <div style="padding:0 24px; display:flex; flex-direction:column; gap:25px;">
                    <div>
                        <div style="font-size:0.75rem; font-weight:800; color:#888; text-transform:uppercase; margin-bottom:10px;">Street Wears</div>
                        <div style="display:flex; flex-direction:column; gap:15px; color:#111;">
                            <div onclick="window.location.assign('?store=ifeomaezema1791')" style="font-weight:600; cursor:pointer;">👗 Ify Fashion ${badge}</div>
                            <div onclick="window.location.assign('?store=kingss1')" style="font-weight:600; cursor:pointer;">💎 Stella Wears ${badge}</div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-size:0.75rem; font-weight:800; color:#888; text-transform:uppercase; margin-bottom:10px;">Luxury Native</div>
                        <div style="display:flex; flex-direction:column; gap:15px; color:#111;">
                            <div onclick="window.location.assign('?store=adivichi')" style="font-weight:600; cursor:pointer;">🧵 Adivici Fashion ${badge}</div>
                            <div onclick="window.location.assign('?store=thomasmongim')" style="font-weight:600; cursor:pointer;">👕 Thomas Mongi ${badge}</div>
                        </div>
                    </div>
                    
                    <div id="unverified-stores-container">
                        <div style="font-size:0.75rem; font-weight:800; color:#888; text-transform:uppercase; margin-bottom:10px; border-top:1px solid #eee; padding-top:20px;">Unverified Stores</div>
                        <div id="unverified-list" style="display:flex; flex-direction:column; gap:15px; color:#111; font-size:0.95rem;">
                             <div onclick="window.location.assign('?store=johnsonclothingline')" style="cursor:pointer;">🏪 Johnson Clothing Line <span style="color:#e60023; font-size:0.6rem;">[NEW]</span></div>
                             <div onclick="window.location.assign('?store=johnsonsneakers')" style="cursor:pointer;">🏪 Johnson Sneakers <span style="color:#e60023; font-size:0.6rem;">[NEW]</span></div>
                        </div>
                    </div>

                    <div id="admin-sidebar-link" style="display:none; margin-top:10px; border-top:2px dashed #eee; padding-top:20px;">
                        <div onclick="window.location.href='admin.html'" style="display:flex; align-items:center; gap:10px; color:#e60023; font-weight:800; cursor:pointer; background:#fff5f5; padding:12px; border-radius:10px; font-size:0.9rem;">
                            <i class="fas fa-arrow-left"></i> RETURN TO ADMIN
                        </div>
                    </div>
                </div>
                <div style="padding:40px 24px; color:#ccc; font-size:0.7rem; text-align:center;">VIRTUALMALL © 2026</div>
            </div>
        </div>`;
    
    // 🔥 Initial check when sidebar opens
    onAuthStateChanged(auth, (user) => {
        const adminLink = document.getElementById('admin-sidebar-link');
        if (adminLink && user && !user.isAnonymous && user.email === window.currentStoreOwnerEmail) {
            adminLink.style.display = 'block';
        }
    });
};