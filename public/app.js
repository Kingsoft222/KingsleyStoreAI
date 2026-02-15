/**
 * Kingsley Store AI - v7.2 (FINAL)
 * RESTORED: v6.0 Home UI, Mic, Search
 * FIXED: Infinite Spinner & X-Button logic
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = ["Nne, what are you looking for today?", "My guy, what are you looking for today?", "Boss, looking for premium native?", "Baddie, let's find your style!"];
let gIndex = 0;
let userPhoto = "";
let selectedCloth = null;
let cartCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { document.getElementById('owner-img').src = saved; userPhoto = saved; }
    
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

// SEARCH & UI LOGIC (LOCKED FROM v6.0)
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(i => i.name.toLowerCase().includes(input) || i.tags.toLowerCase().includes(input));
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('modal-subtext').innerText = "Style Choice: " + selectedCloth.name;
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="window.initiateUploadFlow()" class="primary-btn" style="background:#e60023; color:white; width:100%;">📸 Photo Modeling</button>
    `;
};

window.initiateUploadFlow = () => {
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
        btn.onclick = window.startVertexModeling;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- FIXING THE SPINNER ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const modal = document.getElementById('video-experience-modal');
    modal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `<div id="doppl-loading" style="color:white; text-align:center;">
        <i class="fas fa-spinner fa-spin fa-2x"></i><p>Sewing Your Fit...</p>
    </div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        
        const data = await response.json();
        if (data.result) {
            container.innerHTML = `<img id="final-look" src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block;">`;
            document.getElementById('final-look').classList.add('doppl-walk-motion');
            document.getElementById('video-bottom-section').innerHTML = `<button onclick="window.addToCart()" class="primary-btn" style="background:#28a745; color:white; width:280px; margin-top:20px;">Add to Cart 🛒</button>`;
        }
    } catch (e) {
        container.innerHTML = "<p style='color:white;'>Runway Busy. Try again.</p>";
    }
};

// --- RESTORING THE "X" BUTTON ---
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };

window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    alert("Added to Cart!");
};