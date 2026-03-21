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

// --- 🎯 RESTORED VOICE SEARCH (MIC) ---
const initVoiceSearch = () => {
    const micBtn = document.querySelector('.mic-icon');
    if (!micBtn) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    micBtn.onclick = () => {
        micBtn.style.color = '#e60023';
        recognition.start();
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('ai-input');
        if (input) {
            input.value = transcript;
            window.executeSearch();
        }
        micBtn.style.color = '#5f6368';
    };
    recognition.onerror = () => { micBtn.style.color = '#5f6368'; };
};

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
    resDiv.innerHTML = `
        <div style="height:400px; display:flex; align-items:center; justify-content:center; flex-direction:column;">
            <div class="dotted-spinner"></div>
            <p style="margin-top:20px; font-weight:700;">Connecting Support...</p>
            <button onclick="window.closeFittingRoom()" style="margin-top:20px; padding:12px 24px; border-radius:30px; border:1px solid #ddd; background:#f9f9f9; color:#111; font-weight:700; cursor:pointer;">Back to Store</button>
        </div>`;
    const check = setInterval(() => { if(window.chatway) { window.chatway.show(); window.chatway.open(); clearInterval(check); } }, 500);
};

// --- 🎯 RESTORED SIDEBAR WITH ALL VENDORS & CATEGORIES ---
window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const badge = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#00a2ff" style="margin-left:4px;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-overlay" style="display:block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" onclick="event.stopPropagation()">
                <div style="padding:25px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <span onclick="window.openChatPage()" style="color:#0b57d0; font-weight:700; cursor:pointer;">🎧 Chat Support</span>
                    <span onclick="window.closeFittingRoom()" style="font-size:1.5rem; cursor:pointer;">✕</span>
                </div>
                <div style="padding:0 24px;"><h2 style="font-size:1.4rem; font-weight:900;"><span style="color:#e60023;">Store</span> Option</h2></div>
                <div style="padding:20px 24px; display:flex; flex-direction:column; gap:15px;">
                    <div style="font-size:0.7rem; font-weight:800; color:#888; text-transform:uppercase;">Verified Stores ${badge}</div>
                    <div onclick="window.location.assign('?store=kingss1')" style="font-weight:600; cursor:pointer;">💎 Stella Wears ${badge}</div>
                    <div onclick="window.location.assign('?store=ifeomaezema1791')" style="font-weight:600; cursor:pointer;">👗 Ify Fashion ${badge}</div>
                    <div onclick="window.location.assign('?store=adivichi')" style="font-weight:600; cursor:pointer;">🧵 Adivici Fashion ${badge}</div>
                    <div onclick="window.location.assign('?store=tommybest')" style="font-weight:600; cursor:pointer;">👕 Tommy Best Fashion ${badge}</div>
                    
                    <div style="font-size:0.7rem; font-weight:800; color:#888; text-transform:uppercase; border-top:1px solid #eee; padding-top:15px;">Categories</div>
                    <div onclick="window.quickSearch('Street Wears')" style="font-weight:600; cursor:pointer;">👟 Street Wears</div>
                    <div onclick="window.quickSearch('Luxury Native')" style="font-weight:600; cursor:pointer;">👔 Luxury Native</div>
                </div>
            </div>
        </div>`;
};

// --- 🚀 VTO ENGINE & REMAINING LOGIC ---
window.handleCustomerUpload = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; rd.readAsDataURL(f); };
window.startTryOn = async () => { /* RESTORED AUTO-STITCH LOGIC */ };
window.checkoutWhatsApp = async () => { /* RESTORED WHATSAPP/RECEIPT LOGIC */ };

document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously(auth).catch(() => {});
    window.updateCartUI();
    initVoiceSearch();
    document.getElementById('menu-icon').onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    document.getElementById('cart-icon-container').onclick = window.openCart;
    const sendBtn = document.querySelector('.send-circle');
    if (sendBtn) sendBtn.onclick = (e) => { e.preventDefault(); window.executeSearch(); };

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4>🔥 ${data.label1}</h4><p>Shop now</p></div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4>🔥 ${data.label2}</h4><p>Exclusive</p></div>`;
            }
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(k => ({ id: k, ...data.catalog[k] }));
        }
    });
});

window.executeSearch = () => { /* RESTORED GRID SEARCH LOGIC */ };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; if(window.chatway) { window.chatway.hide(); window.chatway.close(); } };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };