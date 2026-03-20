import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref as dbRef, 
    onValue,
    update,
    set,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getStorage, 
    ref as sRef, 
    uploadString, 
    getDownloadURL, 
    getBlob
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    getAuth, 
    signInAnonymously 
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
const storage = getStorage(app);
const auth = getAuth(app);
const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let tempUserImageUrl = "", selectedCloth = null, storePhone = "2348000000000", storeCatalog = [];
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 

let localUserBase64 = "";
window.activeGreetings = []; 
let gIndex = 0;

const injectChatSupport = () => {
    if (document.getElementById('chatway-script')) return;
    const s = document.createElement("script");
    s.id = "chatway-script";
    s.async = true;
    s.src = "https://cdn.chatway.app/widget.js?id=govCX46EKb8v";
    document.head.appendChild(s);
};

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initGlobalUIStyles(); 
    ensureCartIconExists();
    
    const greetingEl = document.getElementById('dynamic-greeting');
    if (greetingEl) greetingEl.innerText = "Loading greetings...";

    const findAndEnableMenu = () => {
        const elements = document.querySelectorAll('button, div, span, i, svg');
        const menuBtn = Array.from(elements).find(el => {
            const rect = el.getBoundingClientRect();
            const isTopLeft = rect.top < 100 && rect.left < 100 && rect.width > 0;
            const hasIconContent = el.innerText.includes('☰') || el.innerHTML.includes('svg') || el.innerHTML.includes('line') || el.classList.contains('fa-bars');
            return isTopLeft && hasIconContent;
        });

        if (menuBtn && !menuBtn.getAttribute('data-menu-active')) {
            menuBtn.setAttribute('data-menu-active', 'true');
            menuBtn.style.cursor = 'pointer';
            menuBtn.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
        }
    };

    findAndEnableMenu();
    setInterval(findAndEnableMenu, 3000);

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const rawStoreName = data.storeName || "STORE";
            document.getElementById('store-name-display').innerText = rawStoreName;
            const searchInput = document.getElementById('ai-input');
            if (searchInput) {
                searchInput.placeholder = data.searchHint || "Search Senator or Ankara...";
                searchInput.oninput = window.executeSearch;
            }

            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label1 || 'Ladies Wear'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Shop exclusive wear</p>
                    </div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')" style="background:#111; color:white; padding:15px; border-radius:12px; flex:1; cursor:pointer; text-align:left; border:1px solid #333;">
                        <h4 style="margin:0; font-size:1rem; color:white;">${data.label2 || 'Dinner Wear'}</h4>
                        <p style="margin:5px 0 0; font-size:0.75rem; color:#888;">Perfect styles for you</p>
                    </div>`;
            }
            
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            
            if (data.greetingsEnabled !== false) {
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Welcome!"];
                if (greetingEl) {
                    greetingEl.innerText = window.activeGreetings[0];
                    greetingEl.style.display = 'block';
                }
            }

            if (data.catalog) {
                storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
                window.renderProducts(storeCatalog);
            }
            updateCartUI();
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && window.activeGreetings.length > 1) { 
            gIndex = (gIndex + 1) % window.activeGreetings.length;
            el.innerText = window.activeGreetings[gIndex]; 
        }
    }, 4000);

    initVoiceSearch();
});

window.renderProducts = (items) => {
    const listContainer = document.getElementById('ai-results');
    if (!listContainer) return;
    listContainer.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}" alt="${item.name}">
            <h4 style="color:#000; font-weight:700; font-size:0.9rem; margin-top:8px;">${item.name}</h4>
            <p style="color:#e60023; font-weight:800; font-size:1.1rem;">₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

function initGlobalUIStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        #ai-results { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 10px; max-height: 50vh; overflow-y: auto; }
        .result-card { background: #fff; border-radius: 14px; padding: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.2s; overflow: hidden; }
        .result-card img { width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 10px; }
        .dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin-dotted 2s linear infinite; margin: 0 auto; }
        @keyframes spin-dotted { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .zoom-container { position: relative; overflow: hidden; width: 100%; height: 60vh; border-radius: 18px; background: #000; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: zoom-in; }
        .zoom-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; }
        .zoomed { transform: scale(2.8); cursor: zoom-out; }
        .close-preview-x { position: absolute; top: 15px; right: 15px; width: 44px; height: 44px; background: rgba(0,0,0,0.85); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; z-index: 22000; }
        #sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 20000; display: none; }
        #sidebar-drawer { position: fixed; top: 0; left: -320px; width: 300px; height: 100%; background: white; z-index: 20001; transition: left 0.3s; display: flex; flex-direction: column; }
        #sidebar-drawer.open { left: 0; }
        .sidebar-item { display: flex; align-items: center; gap: 16px; padding: 14px 24px; cursor: pointer; color: #1f1f1f; font-weight: 600; }
        .modal-card { background: white; width: 92%; max-width: 380px; margin: auto; border-radius: 28px; padding: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); position: relative; }
        #cart-icon-wrapper { position: fixed; top: 20px; right: 20px; z-index: 10000; background: white; padding: 10px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer; }
    `;
    document.head.appendChild(style);
}

const ensureCartIconExists = () => {
    if (document.getElementById('cart-icon-wrapper')) return;
    const cartDiv = document.createElement('div');
    cartDiv.id = 'cart-icon-wrapper';
    cartDiv.onclick = () => window.openCart();
    cartDiv.innerHTML = `<div style="position:relative;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span id="cart-count-badge" style="position:absolute; top:-12px; right:-12px; background:#e60023; color:white; font-size:10px; font-weight:bold; border-radius:50%; padding:2px 6px;">0</span></div>`;
    document.body.appendChild(cartDiv);
};

window.openOptionsMenu = () => {
    const modal = document.getElementById('fitting-room-modal');
    modal.style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-overlay" style="display: block;" onclick="window.closeFittingRoom()">
            <div id="sidebar-drawer" class="open" onclick="event.stopPropagation()">
                <div style="padding: 28px 24px; font-size: 1.4rem; font-weight: 700; display: flex; justify-content: space-between;">
                    <span>Store Options</span><span onclick="window.closeFittingRoom()">✕</span>
                </div>
                <div onclick="window.openChatPage()" class="sidebar-item">💬 Chat Support</div>
                <div style="padding: 10px 24px; color: gray; font-size: 0.8rem;">LUXURY WEARS</div>
                <div onclick="window.location.assign('?store=kingss1')" class="sidebar-item">💎 Stella Wears</div>
            </div>
        </div>`;
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    const modal = document.getElementById('fitting-room-modal');
    modal.style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div class="modal-card">
            <div class="zoom-container"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="${selectedCloth.imgUrl}" id="preview-img" class="zoom-image"></div>
            <h3 style="margin: 15px 0 5px; font-weight:800;">${selectedCloth.name}</h3>
            <p style="color:#e60023; font-weight:800; font-size:1.4rem;">₦${selectedCloth.price.toLocaleString()}</p>
            <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; font-weight:900; border:none; margin-top:10px;">Wear it! ✨</button>
        </div>`;
    
    const img = document.getElementById('preview-img');
    img.parentElement.onclick = () => img.classList.toggle('zoomed');
};

window.proceedToUpload = () => {
    document.getElementById('ai-fitting-result').innerHTML = `
        <div class="modal-card" style="text-align:center; padding: 40px 20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:3rem;">🤳</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:20px;">UPLOAD YOUR PHOTO</h2>
            <input type="file" id="vto-upload" hidden onchange="window.handleVtoUpload(event)" />
            <button onclick="document.getElementById('vto-upload').click()" style="background:#e60023; color:white; padding:18px; width:100%; border-radius:14px; font-weight:900; border:none;">SELECT FROM GALLERY</button>
        </div>`;
};

window.handleVtoUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
        localUserBase64 = ev.target.result.split(',')[1];
        window.startTryOn();
    };
    reader.readAsDataURL(file);
};

window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `<div class="modal-card" style="text-align:center; padding: 60px 20px;"><div class="dotted-spinner"></div><p style="margin-top:20px; font-weight:800; color:#e60023;">STITCHING YOUR OUTFIT...</p></div>`;

    try {
        const clothBlob = await fetch(selectedCloth.imgUrl).then(r => r.blob());
        const clothBase64 = await new Promise(r => { 
            const reader = new FileReader(); 
            reader.onloadend = () => r(reader.result.split(',')[1]); 
            reader.readAsDataURL(clothBlob); 
        });

        const response = await fetch('/api/process-vto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: localUserBase64, clothImage: clothBase64, category: selectedCloth.category || "Native" })
        });

        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div class="modal-card">
                    <div class="zoom-container"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><img src="data:image/png;base64,${result.image}" class="zoom-image" id="res-img"></div>
                    <button onclick="window.buyNow()" style="background:#25D366; color:white; padding:18px; width:100%; border-radius:14px; font-weight:900; border:none; margin-top:15px;">BUY THIS LOOK ✅</button>
                </div>`;
            const img = document.getElementById('res-img');
            img.parentElement.onclick = () => img.classList.toggle('zoomed');
        } else { throw new Error(result.error); }
    } catch (err) {
        resDiv.innerHTML = `<div class="modal-card" style="text-align:center;"><p>⚠️ ${err.message}</p><button onclick="window.proceedToUpload()">TRY AGAIN</button></div>`;
    }
};

window.buyNow = () => {
    const text = `I'd like to buy the *${selectedCloth.name}* (₦${selectedCloth.price.toLocaleString()})`;
    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`, '_blank');
};

window.executeSearch = () => {
    const q = document.getElementById('ai-input').value.toLowerCase();
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(q));
    window.renderProducts(filtered);
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { document.getElementById('cart-count-badge').innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function applyDynamicThemeStyles() {}
function initVoiceSearch() {}