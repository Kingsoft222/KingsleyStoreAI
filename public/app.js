/**
 * Kingsley Store AI - Core Logic v7.0
 * UPDATES: Vertex Paid Tier Integration, Full-Screen Modal Result, Sleek Mall Spinner.
 * UI: Professional "Add to Cart" UX.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?", "My guy, what are you looking for today?",
    "Classic Babe, what are you looking for today?", "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?", "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhoto = "";
let selectedCloth = null;
let currentMode = 'photo';
let cartCount = 0;

// --- 1. BOOTSTRAP & PROFILE ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2000);

    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
        rec.onresult = (e) => {
            document.getElementById('ai-input').value = e.results[0][0].transcript;
            micBtn.style.color = "#5f6368";
            window.executeSearch();
        };
    }
});

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const imgData = event.target.result;
        document.getElementById('owner-img').src = imgData;
        localStorage.setItem('kingsley_profile_locked', imgData);
        userPhoto = imgData;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 2. SEARCH ENGINE ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim()) return;

    const matched = clothesCatalog.filter(item =>
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// --- 3. PHOTO MODELING ENGINE (VERTEX AI PAID TIER) ---
window.startVertexModeling = async () => {
    // 1. UI Transition
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // 2. Premium Mall Spinner
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px; color:white;">
            <i class="fas fa-cut fa-spin fa-3x" style="color:gold; margin-bottom:20px;"></i>
            <p style="font-weight:bold; letter-spacing:1px;">Tailoring your ${selectedCloth.name}...</p>
            <p style="font-size:0.7rem; opacity:0.6;">Vertex AI Enterprise Active</p>
        </div>
    `;

    try {
        // Sanitize base64
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;

        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        
        const data = await response.json();
        
        if (data.result) {
            // 3. FULL SCREEN RESULT DISPLAY
            container.innerHTML = `
                <div style="width:100%; position:relative; text-align:center;">
                    <img src="data:image/png;base64,${data.result}" 
                         style="width:100%; max-height:70vh; object-fit:contain; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                    
                    <button id="vto-add-to-cart" class="primary-btn" 
                            style="background:linear-gradient(45deg, #d4af37, #b8860b); color:white; margin-top:25px; width:90%; height:60px; border-radius:30px; font-weight:bold; font-size:1.1rem; border:none; cursor:pointer;" 
                            onclick="window.addToCart()">
                        ADD TO CART - ${selectedCloth.price} 🛒
                    </button>
                    
                    <p onclick="location.reload()" style="color:#aaa; margin-top:15px; cursor:pointer; font-size:0.9rem;">Try another outfit</p>
                </div>
            `;
        } else {
            container.innerHTML = `<div style="color:white; padding:20px;">🚨 ${data.error || 'Server connection timed out'}</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:white; padding:20px;">Network Error: Please check your connection.</div>`;
    }
};

// --- 4. SHOWROOM & FLOW ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('modal-subtext').innerText = "Select view for " + selectedCloth.name;
    document.getElementById('fit-action-btn').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; width:100%;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn" style="background:#e60023; color:white; width:100%;">📸 See How You Look (Photo)</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn" style="background:#333; color:white; border:1px solid #e60023; width:100%;">🎥 See How You Look (Video)</button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    document.getElementById('modal-subtext').innerText = "Upload photo for " + mode;
    document.getElementById('ai-fitting-result').innerHTML = "";
    const fitBtn = document.getElementById('fit-action-btn');
    fitBtn.style.display = 'block';
    fitBtn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Rock your cloth";
        btn.style.background = "#e60023";
        btn.onclick = (currentMode === 'photo') ? startVertexModeling : generateWalkCycle;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 5. CART & MODAL CONTROLS ---
window.addToCart = () => {
    cartCount++;
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = cartCount;
        badge.style.transform = "scale(1.5)";
        setTimeout(() => badge.style.transform = "scale(1)", 300);
    }
    
    const cartBtn = document.getElementById('vto-add-to-cart');
    if (cartBtn) {
        cartBtn.innerHTML = "Added to Bag! ✅";
        cartBtn.style.background = "#222";
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };