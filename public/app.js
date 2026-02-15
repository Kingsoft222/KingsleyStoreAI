/**
 * Kingsley Store Mall - v22.5 (STILL PHOTO MASTER)
 * 1. FIXED: Home Page UI, Mic, and Search bar always visible.
 * 2. FIXED: "See How You Look" button handshake.
 * 3. FEATURE: Instant still-photo swap (Sub-10 seconds).
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" },
    { id: 3, name: "White Agbada Classic", tags: "agbada white native", img: "agbada_white.jpg", price: "₦45k" }
];

let userPhoto = "";
let selectedCloth = null;

document.addEventListener('DOMContentLoaded', () => {
    // Restore profile photo from LocalStorage
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { 
        const ownerImg = document.getElementById('owner-img');
        if(ownerImg) ownerImg.src = saved; 
        userPhoto = saved; 
    }

    // MIC LOGIC - Surgical Bind
    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
            rec.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                document.getElementById('ai-input').value = transcript;
                micBtn.style.color = "#5f6368";
                window.executeSearch();
            };
        }
    }
});

// SEARCH LOGIC - Stable Alignment
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!results) return;

    if (!input.trim()) {
        results.style.display = 'none';
        return;
    }

    const matched = clothesCatalog.filter(i => 
        i.name.toLowerCase().includes(input) || i.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" style="width:100%; border-radius:10px;">
                <h4 style="margin:10px 0;">${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    } else {
        results.style.display = 'none';
    }
};

// VTO HANDSHAKE - Direct Trigger
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    
    if (modal && resultArea) {
        modal.style.display = 'flex';
        resultArea.innerHTML = `
            <button id="vto-action-btn" class="primary-btn" style="background:#e60023; color:white; width:100%; padding:15px; border-radius:12px; border:none; font-weight:bold; cursor:pointer;">📸 See How You Look (Photo)</button>
        `;
        
        // Link the button to the hidden gallery input
        document.getElementById('vto-action-btn').onclick = () => {
            document.getElementById('user-fit-input').click();
        };
    }
};

window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startMallSwap();
    };
    reader.readAsDataURL(file);
};

// THE CLOTH-WEARING ENGINE
window.startMallSwap = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const modal = document.getElementById('video-experience-modal');
    modal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `<div style="color:white;text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Wearing your ${selectedCloth.name}...</p></div>`;

    // Watchdog Abort Controller (Kills request after 20s to stop infinite spin)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            signal: controller.signal,
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        
        clearTimeout(timeout);
        const data = await response.json();
        
        if (data.result) {
            // SUCCESS: Show still image result
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block;">`;
            document.getElementById('video-bottom-section').innerHTML = `
                <button onclick="window.addToCart()" class="primary-btn" style="background:#28a745; color:white; width:280px; margin-top:20px; padding:15px; border-radius:12px; border:none; font-weight:bold;">Add to Cart 🛒</button>
            `;
        } else {
            container.innerHTML = `<p style="color:white;">AI Busy. Please try a smaller photo.</p>`;
        }
    } catch (e) {
        clearTimeout(timeout);
        const errorMsg = e.name === 'AbortError' ? "Timed out (20s). Try again." : "Swap failed.";
        container.innerHTML = `<p style='color:white;'>${errorMsg}</p>`;
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };

window.addToCart = () => {
    alert("Item added to cart!");
    window.closeVideoModal();
};