/**
 * Kingsley Store AI - Core Logic v8.3
 * TRIGGER LOCK: Choice Modal only opens on "Rock your cloth" button tap.
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

let gIndex = 0; let userPhoto = ""; let selectedCloth = null; let cartCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { document.getElementById('owner-img').src = saved; userPhoto = saved; }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2000);

    if ('webkitSpeechRecognition' in window) {
        const rec = new window.webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
        rec.onresult = (e) => {
            document.getElementById('ai-input').value = e.results[0][0].transcript;
            micBtn.style.color = "#1a1a1a";
            window.executeSearch();
        };
    }
});

// STEP 1: SEARCH RESULTS
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim()) return;
    const matched = clothesCatalog.filter(i => i.name.toLowerCase().includes(input));
    
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" style="background:#f2f2f2; border-radius:15px; padding:15px; text-align:center;">
                <img src="images/${item.img}" style="width:100%; height:160px; object-fit:contain; border-radius:10px; background:white;">
                <h4 style="margin:10px 0;">${item.name}</h4>
                <p style="color:#e60023; font-weight:800; margin-bottom:10px;">${item.price}</p>
                <button onclick="window.openChoiceModal(${item.id})" style="width:100%; background:#e60023; color:white; border:none; padding:10px; border-radius:8px; font-weight:bold; cursor:pointer;">Rock your cloth</button>
            </div>
        `).join('');
    }
};

// STEP 2: CHOICE MODAL (Triggers on "Rock your cloth")
window.openChoiceModal = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('choice-buttons-area').style.display = 'flex';
    document.getElementById('upload-action-area').style.display = 'none';
};

window.initiateUploadFlow = (mode) => {
    document.getElementById('choice-buttons-area').style.display = 'none';
    document.getElementById('upload-action-area').style.display = 'block';
    const btn = document.getElementById('fit-action-btn');
    btn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Model My Look";
        btn.onclick = window.launchShowroom;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// STEP 3: SHOWROOM REVEAL
window.launchShowroom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('doppl-showroom').style.display = 'block';
    document.getElementById('doppl-loading').style.display = 'flex';
    document.getElementById('doppl-final-render').style.display = 'none';
    window.runAISwap();
};

window.runAISwap = async () => {
    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
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
    } catch (e) { document.getElementById('doppl-loading').innerHTML = "<p>AI Busy. Retry.</p>"; }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeDoppl = () => { document.getElementById('doppl-showroom').style.display = 'none'; };
window.addToCart = () => { cartCount++; document.getElementById('cart-count').innerText = cartCount; };

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('owner-img').src = event.target.result;
        localStorage.setItem('kingsley_profile_locked', event.target.result);
        userPhoto = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
};