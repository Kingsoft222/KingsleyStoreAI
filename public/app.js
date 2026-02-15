/**
 * Kingsley Store AI - Core Logic v7.8
 * SEQUENCE LOCK: Search -> Result -> Choice Modal -> Grounded Reveal.
 * FEATURES: Full Greetings, Large Mic, Profile Save/Clear.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?", 
    "My guy, what are you looking for today?",
    "Classic Babe, what are you looking for today?", 
    "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?", 
    "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhoto = "";
let selectedCloth = null;
let cartCount = 0;
let currentMode = 'photo';

// --- 1. BOOTSTRAP & PROFILE ---
document.addEventListener('DOMContentLoaded', () => {
    // Restore Profile
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    // Start Greetings Loop
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            el.innerText = greetings[gIndex % greetings.length];
            gIndex++;
        }
    }, 2000);

    // Large Mic Voice Logic
    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
        rec.onresult = (e) => {
            document.getElementById('ai-input').value = e.results[0][0].transcript;
            micBtn.style.color = "#1a1a1a";
            window.executeSearch();
        };
    }
});

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = event.target.result;
        document.getElementById('owner-img').src = img;
        localStorage.setItem('kingsley_profile_locked', img);
        userPhoto = img;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = "images/kingsley.jpg";
    userPhoto = "";
    location.reload();
};

// --- 2. NAVIGATION & SEARCH ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim()) return;

    const matched = clothesCatalog.filter(i => 
        i.name.toLowerCase().includes(input) || i.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="background:#f2f2f2; border-radius:15px; padding:12px; text-align:center; cursor:pointer;">
                <img src="images/${item.img}" style="width:100%; height:160px; object-fit:contain; border-radius:10px; background:white; margin-bottom:10px;">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:800;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.quickSearch = (q) => {
    document.getElementById('ai-input').value = q;
    window.executeSearch();
};

// --- 3. THE CHOICE MODAL (THE FLOW YOU REQUESTED) ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const displayArea = document.getElementById('ai-fitting-result');
    const actionBtn = document.getElementById('fit-action-btn');
    
    modal.style.display = 'flex';
    actionBtn.style.display = 'none';
    
    displayArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; width:100%;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn" style="background:#e60023; color:white;">📸 See how you look (photo)</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn" style="background:#333; color:white;">🎥 See how you look (video)</button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    document.getElementById('ai-fitting-result').innerHTML = "";
    const actionBtn = document.getElementById('fit-action-btn');
    actionBtn.style.display = 'block';
    actionBtn.innerText = "Upload Photo";
    actionBtn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const actionBtn = document.getElementById('fit-action-btn');
        actionBtn.innerText = "Process " + (currentMode === 'photo' ? "Photo" : "Video");
        actionBtn.onclick = window.startGroundedReveal;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 4. THE GROUNDED REVEAL ---
window.startGroundedReveal = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('doppl-showroom').style.display = 'block';
    document.getElementById('doppl-loading').style.display = 'flex';
    document.getElementById('doppl-final-render').style.display = 'none';
    window.processAIForensic();
};

window.processAIForensic = async () => {
    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userPhoto.split(',')[1], 
                cloth: selectedCloth.name 
            })
        });
        const data = await response.json();
        if (data.result) {
            const renderImg = document.getElementById('doppl-final-render');
            renderImg.src = `data:image/png;base64,${data.result}`;
            renderImg.onload = () => {
                document.getElementById('doppl-loading').style.display = 'none';
                renderImg.style.display = 'block';
            };
        }
    } catch (e) {
        document.getElementById('doppl-loading').innerHTML = `
            <p style="color:white; font-weight:800;">Server Busy</p>
            <button onclick="window.processAIForensic()" style="background:none; border:1px solid white; color:white; padding:8px; margin-top:10px; border-radius:5px;">Retry</button>
        `;
    }
};

window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    const btn = document.getElementById('doppl-cart-btn');
    btn.innerText = "ADDED TO CART ✅";
    btn.style.background = "#333";
    setTimeout(() => {
        btn.innerText = "Add to cart";
        btn.style.background = "#e60023";
    }, 2000);
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeDoppl = () => { document.getElementById('doppl-showroom').style.display = 'none'; };