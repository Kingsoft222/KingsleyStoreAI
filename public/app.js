/**
 * Kingsley Store AI - Core Logic v7.5
 * FEATURES: Full-Length Runway Result, Vertex AI Paid Tier, AddToCart Sync.
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

    // Mic logic for Voice Search
    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
            rec.onresult = (e) => {
                document.getElementById('ai-input').value = e.results[0][0].transcript;
                micBtn.style.color = "#5f6368";
                window.executeSearch();
            };
        }
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

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = "images/kingsley.jpg";
    userPhoto = "";
};

// --- 2. NAVIGATION & SEARCH ---
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

window.quickSearch = (q) => { 
    document.getElementById('ai-input').value = q; 
    window.executeSearch(); 
};

// --- 3. SHOWROOM FLOW ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('modal-subtext').innerText = "Select view for " + selectedCloth.name;
    document.getElementById('fit-action-btn').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; width:100%;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn" style="background:#e60023; color:white; width:100%; border-radius:50px; padding:15px;">📸 See How You Look (Photo)</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn" style="background:#333; color:white; border:1px solid #e60023; width:100%; border-radius:50px; padding:15px;">🎥 See How You Look (Video)</button>
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
        btn.style.color = "white";
        btn.onclick = (currentMode === 'photo') ? startVertexModeling : generateWalkCycle;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 4. THE IMMERSIVE RUNWAY ENGINE (VERTEX AI) ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // Modern Tailor Spinner
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80vh; color:white; text-align:center;">
            <i class="fas fa-cut fa-spin fa-3x" style="color:#d4af37; margin-bottom:20px;"></i>
            <p style="font-weight:bold; font-size:1.2rem;">Tailoring your ${selectedCloth.name}...</p>
            <p style="font-size:0.8rem; opacity:0.6; margin-top:5px;">Gemini 2.0 Fashion Engine</p>
        </div>
    `;

    try {
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;

        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        
        const data = await response.json();
        
        if (data.result) {
            // FULL LENGTH RUNWAY UI
            container.innerHTML = `
                <div class="runway-result-wrapper" style="width:100%; display:flex; flex-direction:column; align-items:center;">
                    <img src="data:image/png;base64,${data.result}" 
                         style="width:100%; max-width:500px; height:auto; object-fit:cover; display:block; border-radius:0 0 30px 30px;">
                    
                    <div class="action-bar" style="width:100%; padding:40px 0; background:linear-gradient(transparent, #000); display:flex; flex-direction:column; align-items:center;">
                        <button id="vto-add-to-cart" class="primary-btn" 
                                style="background:#e60023; color:white; width:85%; height:65px; border-radius:50px; font-weight:bold; font-size:1.2rem; border:none; cursor:pointer; box-shadow: 0 10px 25px rgba(230,0,35,0.4);" 
                                onclick="window.addToCart()">
                            ADD TO BAG! 🛒
                        </button>
                        <p onclick="location.reload()" style="color:#aaa; margin-top:20px; cursor:pointer; font-size:0.9rem; text-decoration:underline;">Try another design</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">
                <p>🚨 AI Safety Alert: Please try a clearer photo or different pose.</p>
                <button onclick="location.reload()" style="background:#333; color:white; border:none; padding:10px 20px; border-radius:10px; margin-top:20px;">Retry</button>
            </div>`;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">Mall system timed out. Please refresh.</div>`;
    }
};

// --- 5. VIDEO ENGINE (STUB) ---
window.generateWalkCycle = () => {
    alert("Video Runway Walk is coming soon to your Kingsley account!");
};

// --- 6. CART & UI ---
window.addToCart = () => {
    cartCount++;
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = cartCount;
        badge.style.transform = "scale(1.5)";
        setTimeout(() => badge.style.transform = "scale(1)", 200);
    }
    
    const cartBtn = document.getElementById('vto-add-to-cart');
    if (cartBtn) {
        cartBtn.innerText = "Added to Bag! ✅";
        cartBtn.style.background = "#222";
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };