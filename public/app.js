import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref as dbRef, onValue, update, set, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
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

// --- 🎯 RAW STABLE UTILITIES ---
async function optimizeForAI(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 768; // 🎯 Balanced for speed and quality
            let width = img.width, height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
        };
    });
}

async function getBase64FromUrl(url) {
    try {
        // Direct fetch to bypass proxy errors seen in console
        const r = await fetch(url);
        const blob = await r.blob();
        return new Promise((resolve) => {
            const rd = new FileReader();
            rd.onloadend = () => resolve(rd.result.split(',')[1]);
            rd.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Fetch failed", e);
        return "";
    }
}

// --- 🚀 THE RAW FAST ENGINE (Shielded from 500 Errors) ---
window.startTryOn = async () => {
    const resDiv = document.getElementById('ai-fitting-result');
    const fullStoreName = document.getElementById('store-name-display').innerText;
    const vendorFirstName = fullStoreName.split(' ')[0] || "Vendor";
    
    resDiv.innerHTML = `
        <div style="text-align:center; padding:40px 10px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
            <h2 style="color:#e60023; font-weight:900; font-size:1.8rem; margin-bottom:5px;">${vendorFirstName}'s ShowRoom</h2>
            <p style="color:#000; font-weight:800; font-size:1rem; margin-bottom:30px; text-transform:uppercase; letter-spacing:1px;">STITCHING YOUR OUTFIT</p>
            <div class="dotted-spinner"></div>
        </div>`;

    try {
        const optimizedUser = await optimizeForAI(localUserBase64);
        const rawCloth = await getBase64FromUrl(selectedCloth.imgUrl);
        
        if (!optimizedUser || !rawCloth) {
            throw new Error("Missing image data. Please re-upload.");
        }

        const response = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userImage: optimizedUser, 
                clothImage: rawCloth, 
                category: selectedCloth.category || "Native" 
            }) 
        });

        if (!response.ok) throw new Error("Server overloaded. Try once more.");

        const result = await response.json();
        if (result.success) {
            resDiv.innerHTML = `
                <div style="text-align:center;">
                    <div class="close-preview-x" onclick="window.closeFittingRoom()">×</div>
                    <div class="zoom-container" id="result-zoom-box">
                        <img src="data:image/jpeg;base64,${result.image}" class="zoom-image" id="result-img">
                    </div>
                    <button onclick="window.addToCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; margin-top:20px; border:none; cursor:pointer; text-transform:uppercase;">Add to Cart 🛍️</button>
                </div>`;
            const container = document.getElementById('result-zoom-box'), img = document.getElementById('result-img');
            container.onclick = () => img.classList.toggle('zoomed');
        } else {
            alert("Processing error. Try again."); window.closeFittingRoom();
        }
    } catch (e) {
        alert(e.message || "Connection error.");
        window.closeFittingRoom();
    }
};

// ... DOMContentLoaded, Render, Search, Cart, Sidebar remain exactly as fixed previously ...
document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {});
    initGlobalUIStyles(); 
    const menuIcon = document.getElementById('menu-icon');
    if (menuIcon) menuIcon.onclick = (e) => { e.preventDefault(); window.openOptionsMenu(); };
    const cartIcon = document.getElementById('cart-icon-container');
    if (cartIcon) cartIcon.onclick = () => window.openCart();
    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const container = document.getElementById('quick-search-container');
            if (container) {
                container.innerHTML = `
                    <div class="split-card" onclick="window.quickSearch('${data.label1}')"><h4>🔥 ${data.label1 || 'Hoodies'}</h4><p>Shop now</p></div>
                    <div class="split-card" onclick="window.quickSearch('${data.label2}')"><h4>🔥 ${data.label2 || 'Corporate'}</h4><p>Shop now</p></div>`;
            }
            if (data.profileImage) document.getElementById('owner-img').src = data.profileImage;
            let p = data.phone ? data.phone.toString().trim() : "2348000000000";
            storePhone = (!p.startsWith('+') && !p.startsWith('234')) ? "234" + p.replace(/^0+/, '') : p;
            if (data.catalog) { storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] })); window.renderProducts(storeCatalog); }
            updateCartUI();
        }
    });
});

window.renderProducts = (items) => {
    const results = document.getElementById('ai-results');
    if (!results) return;
    results.style.display = 'grid';
    results.innerHTML = items.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice('${item.id}')">
            <img src="${item.imgUrl}" alt="${item.name}">
            <h4 class="cart-item-name">${item.name}</h4>
            <p>₦${item.price.toLocaleString()}</p>
        </div>`).join('');
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = async (ev) => { localUserBase64 = ev.target.result; window.startTryOn(); }; 
    reader.readAsDataURL(file); 
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); window.openCart(); updateCartUI(); };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function initGlobalUIStyles() { const s = document.createElement('style'); s.innerHTML = `.dotted-spinner { width: 50px; height: 50px; border: 5px dotted #e60023; border-radius: 50%; animation: spin 2s linear infinite; margin: 0 auto; } @keyframes spin { 100% { transform: rotate(360deg); } }`; document.head.appendChild(s); }
function applyDynamicThemeStyles() { const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const el = document.getElementById('store-name-display'); if(el) el.style.color = isDark ? 'white' : 'black'; }