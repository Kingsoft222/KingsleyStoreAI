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
let vtoRetryCount = 0;

const geminiApiKey = ""; 

// --- Tawk.to Initialization & Control ---
var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
(function(){
    var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/69b74e7289dbc51c38ca3a16/default';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
})();

Tawk_API.onLoad = function(){
    Tawk_API.hideWidget();
};
Tawk_API.onChatMaximized = function(){
    const head = document.getElementById('draggable-chat-head');
    if(head) head.style.display = 'none';
};
Tawk_API.onChatMinimized = function(){
    const head = document.getElementById('draggable-chat-head');
    if(head && head.getAttribute('data-closed') !== 'true') head.style.display = 'flex';
};

document.addEventListener('DOMContentLoaded', () => {
    applyDynamicThemeStyles();
    signInAnonymously(auth).catch(() => {}); 
    initChatDraggable(); 
    
    // Target existing top-left menu icon precisely
    const findAndEnableMenu = () => {
        const elements = document.querySelectorAll('button, div, span, i');
        const menuBtn = Array.from(elements).find(el => {
            const rect = el.getBoundingClientRect();
            const isTopLeft = rect.top < 80 && rect.left < 80 && rect.width > 0;
            const hasIcon = el.innerText.includes('☰') || el.innerHTML.includes('svg') || el.innerHTML.includes('line') || el.classList.contains('fa-bars');
            return isTopLeft && hasIcon;
        });

        if (menuBtn) {
            menuBtn.style.cursor = 'pointer';
            const openAction = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.openOptionsMenu();
            };
            menuBtn.onclick = openAction;
            menuBtn.ontouchend = openAction;
        }
    };

    findAndEnableMenu();
    const menuInterval = setInterval(findAndEnableMenu, 1000);
    setTimeout(() => clearInterval(menuInterval), 10000);

    onValue(dbRef(db, `stores/${currentStoreId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('store-name-display').innerText = data.storeName || "STORE";
            const searchInput = document.getElementById('ai-input');
            if (searchInput) searchInput.placeholder = data.searchHint || "Search Senator or Ankara...";
            
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
            
            const greetingEl = document.getElementById('dynamic-greeting');
            if (data.greetingsEnabled !== false) {
                window.activeGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : ["Welcome!"];
                if (greetingEl) greetingEl.style.display = 'block';
            } else if (greetingEl) { greetingEl.style.display = 'none'; }

            if (data.catalog) storeCatalog = Object.keys(data.catalog).map(key => ({ id: key, ...data.catalog[key] }));
            updateCartUI();
        }
    });

    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el && window.activeGreetings.length > 0) { 
            el.innerText = window.activeGreetings[gIndex % window.activeGreetings.length]; 
            gIndex++; 
        }
    }, 3000);

    initVoiceSearch();
});

// --- Professional Draggable Chat Logic ---
function initChatDraggable() {
    if (document.getElementById('draggable-chat-head')) return;

    const chatHead = document.createElement('div');
    chatHead.id = 'draggable-chat-head';
    chatHead.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 7V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>';
    chatHead.style = `
        position: fixed; bottom: 100px; right: 20px; width: 64px; height: 64px;
        background: #e60023; border-radius: 50%; display: none; align-items: center;
        justify-content: center; z-index: 1000000; box-shadow: 0 12px 30px rgba(0,0,0,0.3);
        cursor: grab; touch-action: none; user-select: none; border: 2px solid white;
    `;
    
    const closeZone = document.createElement('div');
    closeZone.id = 'chat-close-zone';
    closeZone.innerHTML = '<div style="font-size:1.4rem;">✕</div><div style="font-size:0.6rem; font-weight:900;">CLOSE SUPPORT</div>';
    closeZone.style = `
        position: fixed; bottom: -160px; left: 50%; transform: translateX(-50%);
        width: 140px; height: 140px; background: rgba(230,0,35,0.9); color: white;
        border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 999999; border: 3px solid white; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        opacity: 0; pointer-events: none;
    `;

    document.body.appendChild(chatHead);
    document.body.appendChild(closeZone);

    let isDragging = false;
    let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
    let startTime;

    const dragStart = (e) => {
        startTime = Date.now();
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        
        if (e.target === chatHead || chatHead.contains(e.target)) {
            isDragging = true;
            chatHead.style.cursor = 'grabbing';
            closeZone.style.bottom = '30px';
            closeZone.style.opacity = '1';
        }
    };

    const dragEnd = () => {
        if (!isDragging) return;
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        chatHead.style.cursor = 'grab';
        
        const headRect = chatHead.getBoundingClientRect();
        const zoneRect = closeZone.getBoundingClientRect();
        
        const hCenter = { x: headRect.left + 32, y: headRect.top + 32 };
        const zCenter = { x: zoneRect.left + 70, y: zoneRect.top + 70 };
        const distance = Math.hypot(hCenter.x - zCenter.x, hCenter.y - zCenter.y);

        if (distance < 110) {
            chatHead.style.display = 'none';
            chatHead.setAttribute('data-closed', 'true');
            if (typeof Tawk_API !== 'undefined') Tawk_API.hideWidget();
        }

        closeZone.style.bottom = '-160px';
        closeZone.style.opacity = '0';

        if (Date.now() - startTime < 200 && Math.abs(xOffset) < 5 && Math.abs(yOffset) < 5) {
            if (typeof Tawk_API !== 'undefined') Tawk_API.maximize();
        }
    };

    const drag = (e) => {
        if (isDragging) {
            e.preventDefault();
            const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
            
            currentX = clientX - initialX;
            currentY = clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            chatHead.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    };

    chatHead.addEventListener("touchstart", dragStart, {passive: false});
    document.addEventListener("touchend", dragEnd);
    document.addEventListener("touchmove", drag, {passive: false});

    chatHead.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);
}

window.openOptionsMenu = () => {
    const modal = document.getElementById('fitting-room-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    
    resDiv.innerHTML = `
        <div style="position:relative; padding:40px 20px; text-align:left;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:30px; letter-spacing:-1px; text-align:center;">MENU</h2>
            
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div onclick="window.openChatSupport()" style="background:#111; border:1px solid #333; padding:18px 25px; border-radius:12px; display:flex; align-items:center; cursor:pointer; transition:all 0.2s active:scale-95;">
                    <div style="font-size:1.4rem; margin-right:15px; display:flex; align-items:center;">🎧</div>
                    <span style="color:white; font-weight:700; font-size:1rem; flex:1;">Chat Support</span>
                    <div style="color:#444; font-size:1rem;">›</div>
                </div>
                
                <!-- Future Options Template -->
            </div>

            <div style="text-align:center; margin-top:40px;">
                <p style="color:#444; font-size:0.6rem; letter-spacing:2px; font-weight:900;">VIRTUAL MALL SECURE</p>
            </div>
        </div>`;
    applyDynamicThemeStyles();
};

window.openChatSupport = () => {
    const head = document.getElementById('draggable-chat-head');
    if (head) {
        head.style.display = 'flex';
        head.setAttribute('data-closed', 'false');
    }
    if (typeof Tawk_API !== 'undefined') {
        Tawk_API.maximize();
        window.closeFittingRoom();
    }
};

function applyDynamicThemeStyles() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adaptiveTextColor = isDarkMode ? 'white' : 'black';
    const styleId = 'dynamic-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        #dynamic-greeting, #store-name-display, .summary-text, .theme-subtext, .theme-p { color: ${adaptiveTextColor} !important; }
        #ai-input { color: ${adaptiveTextColor}; background: ${isDarkMode ? '#222' : '#f9f9f9'}; }
        .result-card { background: #ffffff !important; border-radius: 12px; padding: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .result-card h4, .cart-item-name { color: #000000 !important; font-weight: 700; margin: 5px 0; }
        .result-card p { color: #e60023 !important; font-weight: bold; }
        .checkout-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 10000; color: white; }
        .zoom-container { position: relative; overflow: hidden; width: 100%; height: 65vh; border-radius: 15px; background: #000; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: zoom-in; }
        .zoom-image { width: 100%; height: 100%; object-fit: contain; transition: transform 0.3s ease; transform-origin: center; pointer-events: none; }
        .zoomed { transform: scale(2.8); cursor: zoom-out; }
        .close-preview-x { position: absolute; top: 15px; right: 15px; width: 40px; height: 40px; background: rgba(0,0,0,0.8); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; z-index: 10005; border: 2px solid rgba(255,255,255,0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .modal-close-btn, .close-modal, .modal-header .close, .modal-content > .close, #fitting-room-modal > span:first-child, .close-btn { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
    `;
}

function initVoiceSearch() {
    const micBtn = document.getElementById('mic-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !micBtn) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    micBtn.onclick = () => { micBtn.style.color = "#e60023"; recognition.start(); };
    recognition.onresult = (e) => { 
        document.getElementById('ai-input').value = e.results[0][0].transcript; 
        micBtn.style.color = "#5f6368"; 
        window.executeSearch(); 
    };
}

window.closeFittingRoom = () => {
    vtoRetryCount = 0;
    tempUserImageUrl = "";
    localUserBase64 = "";
    const modal = document.getElementById('fitting-room-modal');
    if (modal) modal.style.display = 'none';
};

window.promptShowroomChoice = (id) => {
    selectedCloth = storeCatalog.find(c => String(c.id) === String(id));
    tempUserImageUrl = ""; 
    localUserBase64 = "";
    vtoRetryCount = 0;
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    
    resDiv.innerHTML = `
        <div style="text-align:center; padding:5px; position:relative;">
            <div class="zoom-container" id="preview-zoom-box">
                <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                <img src="${selectedCloth.imgUrl}" class="zoom-image" id="preview-img">
            </div>
            <div style="padding:15px 10px;">
                <h3 class="summary-text" style="margin-bottom:2px; font-weight:800;">${selectedCloth.name}</h3>
                <p style="color:#e60023; font-weight:800; font-size:1.4rem; margin-bottom:15px;">₦${selectedCloth.price.toLocaleString()}</p>
                <p style="color:#888; font-size:0.75rem; margin-bottom:15px;">Tap to zoom & move to pan</p>
                <button onclick="window.proceedToUpload()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; cursor:pointer; border:none; font-size:1.2rem; text-transform:uppercase; letter-spacing:1px; box-shadow: 0 8px 20px rgba(230,0,35,0.3);">Wear it! ✨</button>
            </div>
        </div>`;
    
    const container = document.getElementById('preview-zoom-box');
    const img = document.getElementById('preview-img');

    const handlePan = (e) => {
        if (!img.classList.contains('zoomed')) return;
        const rect = container.getBoundingClientRect();
        const clientX = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${Math.min(Math.max(x, 0), 100)}% ${Math.min(Math.max(y, 0), 100)}%`;
    };

    container.onclick = (e) => {
        if (e.target.classList.contains('close-preview-x')) return; 
        img.classList.toggle('zoomed');
        container.style.cursor = img.classList.contains('zoomed') ? 'zoom-out' : 'zoom-in';
        if (img.classList.contains('zoomed')) handlePan(e);
    };

    container.onmousemove = handlePan;
    container.ontouchmove = handlePan;
    applyDynamicThemeStyles();
};

window.proceedToUpload = () => {
    vtoRetryCount = 0; 
    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="text-align:center; padding:20px; position:relative;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:3.5rem; margin-bottom:15px;">🤳</div>
            <h2 style="color:#e60023; font-weight:900; margin-bottom:5px;">FINISH YOUR LOOK</h2>
            <p class="theme-subtext" style="font-weight:600; margin-bottom:25px; line-height:1.4;">Upload a clear full-body photo<br><span style="font-weight:400; font-size:0.8rem; color:#888;">(Head to toe for best results)</span></p>
            <input type="file" id="temp-tryon-input" hidden onchange="window.handleCustomerUpload(event)" />
            <button id="vto-upload-btn" onclick="document.getElementById('temp-tryon-input').click()" style="background:#e60023; color:white; padding:20px; width:100%; border-radius:14px; font-weight:900; cursor:pointer; border:none; font-size:1.1rem;">SELECT FROM GALLERY</button>
            <button onclick="window.promptShowroomChoice('${selectedCloth.id}')" style="background:transparent; color:#888; border:none; padding:12px; margin-top:20px; width:100%; font-weight:bold;">Go Back</button>
        </div>`;
    applyDynamicThemeStyles();
};

window.handleCustomerUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return;
    const btn = document.getElementById('vto-upload-btn');
    if(btn) { btn.innerText = "PREPARING PHOTO..."; btn.disabled = true; }

    const reader = new FileReader(); 
    reader.onload = async (ev) => { 
        const base64 = await resizeImage(ev.target.result);
        localUserBase64 = base64.split(',')[1]; 
        
        window.startTryOn(); 

        const fileName = `vto_temp/${Date.now()}.jpg`;
        const storageRef = sRef(storage, fileName);
        uploadString(storageRef, base64, 'data_url').catch(err => console.error("History sync fail", err));
    }; 
    reader.readAsDataURL(file); 
};

window.startTryOn = async () => {
    if (!localUserBase64 || !selectedCloth) return;
    const resDiv = document.getElementById('ai-fitting-result');
    
    resDiv.innerHTML = `
        <div style="position:relative; text-align:center; padding:60px 20px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px; width:100%;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div class="rotating-dots" style="display:flex; gap:8px;">
                <div class="dot" style="width:12px; height:12px; background:#e60023; border-radius:50%; animation: pulse 1s infinite alternate;"></div>
                <div class="dot" style="width:12px; height:12px; background:#e60023; border-radius:50%; animation: pulse 1s infinite alternate 0.2s;"></div>
                <div class="dot" style="width:12px; height:12px; background:#e60023; border-radius:50%; animation: pulse 1s infinite alternate 0.4s;"></div>
            </div>
            <p style="margin-top:25px; font-weight:800; color:#e60023; letter-spacing:1px; text-transform:uppercase;">Stitching your outfit...</p>
        </div>
        <style> @keyframes pulse { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1.2); } } </style>`;

    try {
        const prompt = "High-Fidelity Virtual Try-On Task: Image 1 is a person. Image 2 is a specific clothing garment. Generate a single, photorealistic image where the person from Image 1 is wearing the exact clothing garment from Image 2. CRITICAL: You must keep the person's face, identity, body pose, hair, and the entire background from Image 1 exactly as they appear. Only change the clothing to match Image 2. Drape the garment naturally and realistically on their body.";
        
        let clothBase64;
        try {
            let path = selectedCloth.imgUrl;
            if (path.includes('firebasestorage.googleapis.com')) {
                const decodedUrl = decodeURIComponent(path.split('/o/')[1].split('?')[0]);
                const clothStorageRef = sRef(storage, decodedUrl);
                const blob = await getBlob(clothStorageRef);
                clothBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            } else {
                const img = new Image();
                img.setAttribute('crossOrigin', 'anonymous');
                clothBase64 = await new Promise((resolve, reject) => {
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width; canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg').split(',')[1]);
                    };
                    img.onerror = () => reject(new Error("CLOTH_LOAD_ERROR"));
                    img.src = selectedCloth.imgUrl + (selectedCloth.imgUrl.includes('?') ? '&' : '?') + 'c=' + Date.now();
                });
            }
        } catch (e) {
            const clothResp = await fetch(selectedCloth.imgUrl, { mode: 'cors' });
            const clothBlob = await clothResp.blob();
            clothBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(clothBlob);
            });
        }

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/jpeg", data: localUserBase64 } },
                    { inlineData: { mimeType: "image/jpeg", data: clothBase64 } }
                ]
            }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        };

        const activeKey = geminiApiKey || firebaseConfig.apiKey;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        
        const resultData = await response.json();
        const generatedBase64 = resultData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (generatedBase64) {
            vtoRetryCount = 0;
            const imgSrc = `data:image/jpeg;base64,${generatedBase64}`;
            resDiv.innerHTML = `
                <div style="position:relative; text-align:center; padding:10px;">
                    <div class="zoom-container" style="height:auto; min-height:40vh; background:transparent;">
                        <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
                        <img src="${imgSrc}" style="width:100%; border-radius:15px; box-shadow: 0 15px 40px rgba(0,0,0,0.6);">
                    </div>
                    <div style="display:flex; gap:12px; margin-top:20px;">
                        <button onclick="window.addToCart()" style="flex:2; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer; font-size:1.1rem;">Add to Cart 🛍️</button>
                        <button onclick="window.closeFittingRoom()" style="flex:1; padding:20px; background:#333; color:white; border-radius:14px; font-weight:bold; border:none; cursor:pointer;">Discard</button>
                    </div>
                </div>`;
        } else {
            throw new Error("AI_NO_IMAGE");
        }
    } catch (e) { 
        if (vtoRetryCount < 3) {
            vtoRetryCount++;
            setTimeout(() => window.startTryOn(), 3000);
        } else {
            displayVTOError("AI Tailor is Busy", "The server is recovering from heavy load. Please try again shortly.");
        }
    }
};

function displayVTOError(title, msg) {
    const resDiv = document.getElementById('ai-fitting-result');
    if (!resDiv) return;
    resDiv.innerHTML = `
        <div style="position:relative; text-align:center; padding:40px 20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <p style="color:white; font-weight:700;">${title}</p>
            <p style="color:#888; font-size:0.85rem; margin-top:10px;">${msg}</p>
            <button onclick="window.startTryOn()" style="background:#e60023; color:white; border:none; padding:15px; margin-top:20px; width:100%; border-radius:12px; font-weight:bold; cursor:pointer;">RETRY NOW</button>
            <button onclick="window.proceedToUpload()" style="background:transparent; color:#e60023; border:none; padding:12px; margin-top:10px; width:100%; font-weight:bold; cursor:pointer;">Try another photo</button>
        </div>`;
}

window.addToCart = () => {
    if(!selectedCloth) return;
    cart.push(selectedCloth);
    localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart));
    updateCartUI(); 
    showToast("✅ Added successfully"); 

    const resDiv = document.getElementById('ai-fitting-result');
    resDiv.innerHTML = `
        <div style="position:relative; text-align:center; padding:60px 20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <div style="font-size:4rem; margin-bottom:20px;">🛍️</div>
            <h2 style="color:white; margin-bottom:25px; font-weight:900;">IN YOUR BAG!</h2>
            <button onclick="window.openCart()" style="width:100%; padding:20px; background:#e60023; color:white; border-radius:14px; font-weight:900; border:none; cursor:pointer; margin-bottom:12px; font-size:1.1rem;">CHECKOUT NOW</button>
            <button onclick="window.closeFittingRoom()" style="width:100%; padding:20px; background:#333; color:white; border-radius:14px; font-weight:bold; border:none; cursor:pointer;">KEEP SHOPPING</button>
        </div>`;
};

window.checkoutWhatsApp = async () => {
    if (cart.length === 0) return;
    const loader = document.getElementById('checkout-loader');
    if(loader) loader.style.display = 'flex';
    const orderId = "VM-RCP-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const total = cart.reduce((s, i) => s + i.price, 0);
    const orderDate = new Date().toLocaleString();
    try {
        await update(dbRef(db, `stores/${currentStoreId}/analytics`), { 
            whatsappClicks: increment(1),
            totalRevenue: increment(total),
            lastSaleID: orderId
        });
        await set(dbRef(db, `receipts/${orderId}`), {
            storeId: currentStoreId, items: cart, total: total, date: orderDate, verifiedHost: window.location.hostname
        });
        const receiptLink = `${window.location.origin}/receipt.html?id=${orderId}`;
        const summaryMsg = `🛡️ *VERIFIED VIRTUALMALL ORDER*%0AOrder ID: *${orderId}*%0ATotal: *₦${total.toLocaleString()}*%0A%0A✅ *View Official Receipt:*%0A${receiptLink}`;
        const waUrl = `https://wa.me/${storePhone.replace('+', '')}?text=${summaryMsg}`;
        cart = []; localStorage.removeItem(`cart_${currentStoreId}`); updateCartUI();
        if(loader) loader.style.display = 'none';
        window.location.assign(waUrl);
    } catch(e) { 
        if(loader) loader.style.display = 'none';
        alert("Accountability sync failed.");
    }
};

window.openCart = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const resDiv = document.getElementById('ai-fitting-result');
    if (cart.length === 0) { resDiv.innerHTML = `<div style="position:relative; padding:60px 20px; text-align:center;"><div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div><h3 class="summary-text">Your cart is empty</h3></div>`; return; }
    let total = cart.reduce((s, i) => s + i.price, 0);
    let itemsHTML = cart.map((item, idx) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;"><div style="text-align:left;"><p class="cart-item-name" style="margin:0; font-weight:bold;">${item.name}</p><p style="margin:0; color:#e60023;">₦${item.price.toLocaleString()}</p></div><button onclick="window.removeFromCart(${idx})" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;">✕</button></div>`).join('');
    resDiv.innerHTML = `
        <div style="position:relative; padding:20px;">
            <div class="close-preview-x" onclick="window.closeFittingRoom()">✕</div>
            <h2 style="color:#e60023; font-weight:800;">YOUR CART SUMMARY</h2>
            <div style="max-height:250px; overflow-y:auto; margin-bottom:20px;">${itemsHTML}</div>
            <div style="display:flex; justify-content:space-between; font-weight:800; margin-bottom:20px; border-top: 2px solid #e60023; padding-top:15px;"><span class="summary-text">Order Total:</span> <span class="summary-text">₦${total.toLocaleString()}</span></div>
            <button onclick="window.checkoutWhatsApp()" style="width:100%; padding:20px; background:#25D366; color:white; border-radius:14px; border:none; font-weight:900; cursor:pointer; font-size:1.1rem;"><i class="fab fa-whatsapp"></i> CHECKOUT ON WHATSAPP</button>
        </div>`;
    applyDynamicThemeStyles();
};

window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase().trim();
    const results = document.getElementById('ai-results');
    if (!query) { results.innerHTML = ""; results.style.display = 'none'; return; }
    const filtered = storeCatalog.filter(c => c.name.toLowerCase().includes(query) || (c.tags && c.tags.toLowerCase().includes(query)));
    results.style.display = 'grid';
    results.innerHTML = filtered.map(item => `<div class="result-card" onclick="window.promptShowroomChoice('${item.id}')"><img src="${item.imgUrl}"><h4 class="cart-item-name">${item.name}</h4><p style="color:#e60023; font-weight:bold;">₦${item.price.toLocaleString()}</p></div>`).join('');
};

async function resizeImage(b64) { 
    return new Promise((res) => { 
        const img = new Image(); 
        img.onload = () => { 
            const canvas = document.createElement('canvas'); 
            const MAX = 800; 
            let w = img.width, h = img.height; 
            if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } 
            else { if (h > MAX) { w *= MAX/h; h = MAX; } } 
            canvas.width = w; canvas.height = h; 
            const ctx = canvas.getContext('2d'); 
            ctx.drawImage(img, 0, 0, w, h); 
            res(canvas.toDataURL('image/jpeg', 0.80)); 
        }; 
        img.src = b64; 
    }); 
}

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.updateCartUI = () => { const c = document.getElementById('cart-count'); if (c) c.innerText = cart.length; };

function showToast(m) { 
    const t = document.createElement('div'); 
    t.className = 'cart-toast'; 
    t.innerText = m; 
    document.body.appendChild(t); 
    setTimeout(() => t.remove(), 2500); 
}

window.removeFromCart = (idx) => { cart.splice(idx, 1); localStorage.setItem(`cart_${currentStoreId}`, JSON.stringify(cart)); updateCartUI(); window.openCart(); };