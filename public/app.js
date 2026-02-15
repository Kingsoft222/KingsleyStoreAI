/**
 * Kingsley Store AI - Core Logic v7.7 (FINAL MASTER)
 * FEATURES: Real-time AddToCart, High-Speed Video Handshake.
 * FIXED: Infinite Spinner, X-Button, Kinetic Walk.
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

// --- 1. BOOTSTRAP & PROFILE (RESTORED) ---
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

// --- 3. SHOWROOM & ENGINES ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('modal-subtext').innerText = "Select view for " + selectedCloth.name;
    document.getElementById('fit-action-btn').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; width:100%;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn" style="background:#e60023; color:white;">📸 See How You Look (Photo)</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn" style="background:#333; color:white; border:1px solid #e60023;">🎥 See How You Look (Video)</button>
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
        btn.onclick = (currentMode === 'photo') ? window.startVertexModeling : window.generateWalkCycle;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- PHOTO MODE ENGINE (KINETIC WALK) ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    const bottomSection = document.getElementById('video-bottom-section');

    container.innerHTML = `
        <div id="loader-placeholder" style="color:white; text-align:center;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top:10px;">Sewing Your Fit...</p>
        </div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        
        if (data.result) {
            container.innerHTML = `<img id="final-render" src="data:image/png;base64,${data.result}" style="width:100%; border-radius:30px; display:block;">`;
            const renderImg = document.getElementById('final-render');
            // Trigger Kinetic Motion
            renderImg.classList.add('doppl-walk-motion');
            
            bottomSection.innerHTML = `
                <button id="vto-add-to-cart" class="primary-btn" style="background:#28a745; color:white; margin-top:20px; width:280px;" onclick="window.addToCart()">Add to Cart 🛒</button>
            `;
        }
    } catch (e) {
        container.innerHTML = "<p style='color:white;'>Runway Busy. Try again.</p>";
    }
};

window.generateWalkCycle = async () => {
    const videoModal = document.getElementById('video-experience-modal');
    const wrapper = document.getElementById('video-main-container');
    const bottomSection = document.getElementById('video-bottom-section');
    videoModal.style.display = 'flex';
    
    wrapper.innerHTML = `
        <div id="loader-placeholder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:white;">
            <i class="fas fa-spinner fa-spin fa-2x" style="margin-bottom:15px;"></i>
            <p style="font-weight: bold; margin:0;">Sewing Runway Walk...</p>
        </div>
        <video id="boutique-video-player" autoplay loop muted playsinline style="display:none; width:100%; border-radius:30px;"></video>
    `;

    try {
        fetch('/.netlify/functions/generate-video-background', {
            method: 'POST',
            body: JSON.stringify({ swappedImage: userPhoto.split(',')[1], clothName: selectedCloth.name })
        });

        let attempts = 0;
        let checkInterval = setInterval(async () => {
            attempts++;
            const statusRes = await fetch(`/.netlify/functions/check-video-status?cloth=${selectedCloth.name}`);
            const statusData = await statusRes.json();
            
            if (statusData.videoUrl) {
                clearInterval(checkInterval);
                document.getElementById('loader-placeholder').style.display = 'none';
                const player = document.getElementById('boutique-video-player');
                player.src = statusData.videoUrl;
                player.style.display = 'block';
                
                bottomSection.innerHTML = `
                    <button id="vto-add-to-cart" class="primary-btn" style="background:#28a745; color:white; margin-top:20px; width:280px;" onclick="window.addToCart()">Add to Cart 🛒</button>
                `;
            }
            if (attempts > 30) { 
                clearInterval(checkInterval);
                document.getElementById('loader-placeholder').innerHTML = "<p style='color:white;'>Runway busy. Try again.</p>";
            }
        }, 2000);
    } catch (e) { console.error("Video Trigger Failed"); }
};

// --- 4. UTILS & MODAL CLOSING ---
window.addToCart = () => {
    cartCount++;
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = cartCount;
        badge.style.transform = "scale(1.3)";
        setTimeout(() => badge.style.transform = "scale(1)", 200);
    }
    const cartBtn = document.getElementById('vto-add-to-cart');
    if (cartBtn) {
        cartBtn.innerText = "Added to Cart! ✅";
        cartBtn.style.background = "#333";
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };