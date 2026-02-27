import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const db = getDatabase(app, "https://kingsleystoreai-default-rtdb.firebaseio.com");

const urlParams = new URLSearchParams(window.location.search);
const currentStoreId = urlParams.get('store') || 'kingsley'; 

let tempCustomerPhoto = ""; 
let selectedCloth = null;
let cart = JSON.parse(localStorage.getItem(`cart_${currentStoreId}`)) || []; 

let storePhone = ""; 
let storeCatalog = []; 
window.activeGreetings = []; 
let gIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const storeRef = ref(db, `stores/${currentStoreId}`);
    onValue(storeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || currentStoreId.toUpperCase() + " STORE";
            
            // Search Hint
            const searchInput = document.getElementById('ai-input');
            if (searchInput) { searchInput.placeholder = data.searchHint || "Search Senator or Ankara"; }

            // Profile Pic Restoration
            if (data.profileImage) {
                const ownerImg = document.getElementById('owner-img');
                if(ownerImg) { ownerImg.src = data.profileImage; ownerImg.style.display = 'block'; }
            }

            // --- WHATSAPP NUMBER FIX ---
            // If number doesn't start with +, add country code 234 automatically
            let rawPhone = data.phone ? data.phone.toString().trim() : "2348000000000";
            if (!rawPhone.startsWith('+') && !rawPhone.startsWith('234')) {
                storePhone = "234" + rawPhone.replace(/^0+/, ''); 
            } else {
                storePhone = rawPhone;
            }
            
            // Greetings Fix
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled === true) {
                if (greetingEl) greetingEl.style.display = 'block';
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Chief, looking for premium native?"];
            } else {
                window.activeGreetings = []; 
                if (greetingEl) { greetingEl.style.display = 'none'; }
            }

            setTimeout(() => {
                const qsArray = (data.quickSearches && data.quickSearches.length > 0) ? data.quickSearches : ["Native Wear", "Jeans"];
                const container = document.getElementById('quick-search-container');
                if (container) {
                    container.innerHTML = qsArray.map(tag => `<div class="search-card" onclick="window.quickSearch('${tag}')"><strong>${tag}</strong></div>`).join('');
                }
            }, 150);

            if (data.catalog) {
                storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
            }
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && window.activeGreetings.length > 0) { 
            el.innerText = window.activeGreetings[gIndex % window.activeGreetings.length]; 
            gIndex++; 
        }
    }, 2500);

    initVoiceSearch();
    updateCartUI();
});

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    tempCustomerPhoto = ""; 
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resultDiv = document.getElementById('ai-fitting-result');
    resultDiv.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h2 style="font-weight:800; color:white;">AI Showroom</h2>
            <p style="color:white;">Try on <strong>${selectedCloth.name}</strong>.</p>
            <p style="color:white; font-size:0.9rem; margin-bottom:15px;">Upload body photo (capturing from head to toe)</p>
            <input type="file" id="temp-tryon-input" hidden accept="image/*" onchange="window.handleCustomerUpload(event)" />
            <button onclick="document.getElementById('temp-tryon-input').click()" style="width:100%; padding:18px; background:#e60023; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">Select from Gallery</button>
        </div>`;
};

window.startTryOn = async () => {
    const resultDiv = document.getElementById('ai-fitting-result');
    // RESTORED CIRCULAR SPINNER
    resultDiv.innerHTML = `
        <div class="loader-container">
            <div class="rotating-dots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
            <p style="margin-top:20px; font-weight:800; color:white;">STITCHING YOUR LOOK...</p>
        </div>`;
    
    try {
        const rawClothData = await getBase64FromUrl(selectedCloth.imgUrl);
        const response = await fetch('/api/process-vto', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: tempCustomerPhoto, clothImage: rawClothData, category: selectedCloth.cat }) 
        });
        const result = await response.json();
        
        if (result.success) {
            resultDiv.innerHTML = `
                <img src="data:image/jpeg;base64,${result.image}" style="width:100%; border-radius:12px; margin-top:20px;">
                <div style="margin-top:15px; display:flex; flex-direction:column; gap:10px;">
                    <button id="add-to-cart-dynamic" onclick="window.addToCart()" style="width:100%; padding:18px; background:#e60023; color:white; border:none; border-radius:12px; font-weight:bold; cursor:pointer;">Add to Cart 🛍️</button>
                </div>`;
        }
    } catch (e) { alert("Error connecting. Please retry."); window.closeFittingRoom(); }
};

window.addToCart = () => {
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI();
    showToast(`✅ Added!`);
    window.closeFittingRoom();
};

window.checkoutWhatsApp = () => {
    let list = cart.map(i => `▪ 1x ${i.name} - ₦${i.price.toLocaleString()}`).join('%0A');
    let total = cart.reduce((s, i) => s + i.price, 0);
    // WhatsApp URL restoration
    const finalPhone = storePhone.replace('+', '');
    window.open(`https://wa.me/${finalPhone}?text=Hello%20${currentStoreId},%20I%20want%20to%20order:%0A${list}%0A%0A*TOTAL:%20₦${total.toLocaleString()}*`);
};

// ... Rest of helper functions (resizeImage, getBase64FromUrl, closeFittingRoom, updateCartUI) ...
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
function showToast(m) { const t = document.createElement('div'); t.className = 'cart-toast'; t.innerText = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }