/**
 * Kingsley Store AI - Core Logic v7.4
 * FULL AUTHORIZED VERSION: Includes Greetings, Mic, Profile, and Doppl Engine.
 * NO FRAGMENTS.
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

// --- 1. BOOTSTRAP & PROFILE ---
document.addEventListener('DOMContentLoaded', () => {
    // Load Saved Profile
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    // Rotating Greetings
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            el.innerText = greetings[gIndex % greetings.length];
            gIndex++;
        }
    }, 2000);

    // Large Mic & Voice Logic
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';

        const micBtn = document.getElementById('mic-btn');
        const aiInput = document.getElementById('ai-input');

        micBtn.onclick = () => {
            try {
                recognition.start();
                micBtn.style.color = "#e60023"; // Accent red when recording
                aiInput.placeholder = "Listening...";
            } catch (err) {
                recognition.stop();
            }
        };

        recognition.onresult = (event) => {
            aiInput.value = event.results[0][0].transcript;
            micBtn.style.color = "#1a1a1a";
            aiInput.placeholder = "Search Senator or Ankara...";
            window.executeSearch();
        };
    }
});

// Profile Management
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
    location.reload(); // Hard reset to clear state
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
            <div class="result-card" onclick="window.initiateDoppl(${item.id})" style="cursor:pointer;">
                <img src="images/${item.img}" alt="${item.name}">
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

// --- 3. THE GROUNDED DOPPL SHOWROOM ---
window.initiateDoppl = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    if (!userPhoto) {
        alert("Bros, upload your profile photo first!");
        return;
    }
    
    // Switch to Showroom
    document.getElementById('doppl-showroom').style.display = 'block';
    document.getElementById('doppl-loading').style.display = 'flex';
    document.getElementById('doppl-final-render').style.display = 'none';
    
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
            <p style="color:white; font-weight:800;">Server Busy</p>
            <button onclick="window.processForensicSwap()" style="background:none; border:1px solid white; color:white; padding:8px; margin-top:10px; border-radius:5px;">Retry</button>
        `;
    }
};

// --- 4. CART LOGIC ---
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

window.closeDoppl = () => { 
    document.getElementById('doppl-showroom').style.display = 'none'; 
};

window.closeFittingRoom = () => { 
    document.getElementById('fitting-room-modal').style.display = 'none'; 
};