/**
 * Kingsley Store AI - Core Logic v7.1
 * DOPPL REVEAL: Full-screen grounded layout.
 * FIX: User now "stands" on the floor.
 * FIX: Floating red pill button logic.
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
        document.getElementById('owner-img').src = event.target.result;
        localStorage.setItem('kingsley_profile_locked', event.target.result);
        userPhoto = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = "images/kingsley.jpg";
    userPhoto = "";
};

// --- 2. SEARCH & NAVIGATION ---
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
            <div class="result-card" onclick="window.initiateDoppl(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };

// --- 3. THE GROUNDED DOPPL REVEAL ---
window.initiateDoppl = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    if (!userPhoto) {
        alert("Please upload your profile photo first!");
        return;
    }
    
    // OPEN SHOWROOM
    const showroom = document.getElementById('doppl-showroom');
    const loading = document.getElementById('doppl-loading');
    const renderImg = document.getElementById('doppl-final-render');
    
    showroom.style.display = 'block';
    loading.style.display = 'flex';
    renderImg.style.display = 'none';
    
    window.processForensicSwap();
};

window.processForensicSwap = async () => {
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
            
            // Grounding logic: Ensure the image is loaded before hiding loader
            renderImg.onload = () => {
                document.getElementById('doppl-loading').style.display = 'none';
                renderImg.style.display = 'block';
            };
        }
    } catch (e) {
        document.getElementById('doppl-loading').innerHTML = `
            <p style="color:white; font-weight:800;">Runway Busy</p>
            <button onclick="window.processForensicSwap()" style="background:none; border:1px solid white; color:white; padding:8px; margin-top:10px; border-radius:5px;">Retry</button>
        `;
    }
};

// --- 4. CART LOGIC ---
window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    const btn = document.getElementById('doppl-cart-btn');
    
    // UI Feedback exactly like reference
    btn.innerText = "ADDED TO CART ✅";
    btn.style.background = "#333";
    setTimeout(() => {
        btn.innerText = "Add to cart";
        btn.style.background = "#e60023";
    }, 2000);
};

window.closeDoppl = () => { document.getElementById('doppl-showroom').style.display = 'none'; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };