/**
 * Kingsley Store AI - v12.5 (MASTER REPAIR)
 * 1. Fixed Mic/Search Handshake.
 * 2. Instant Still-Photo Swap.
 * 3. UI Stability.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { 
        const ownerImg = document.getElementById('owner-img');
        if(ownerImg) ownerImg.src = saved; 
        userPhoto = saved; 
    }

    // MIC LOGIC - Surgical Fix
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

// SEARCH LOGIC - Fixed Scattering
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!results) return;

    // Clear previous rubbish
    results.innerHTML = "";
    
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
                <img src="images/${item.img}" style="width:100%; height:120px; object-fit:contain; border-radius:8px;">
                <h4 style="margin:8px 0 4px; font-size:0.9rem;">${item.name}</h4>
                <p style="color:#e60023; font-weight:bold; margin:0;">${item.price}</p>
            </div>
        `).join('');
    } else {
        results.style.display = 'none';
    }
};

// VTO LOGIC - Direct Swap
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer;">📸 Upload Photo to Swap</button>
    `;
};

window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startVertexModeling();
    };
    reader.readAsDataURL(file);
};

window.startVertexModeling = async () => {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `<div style="color:white;text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Swapping Outfit...</p></div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        if (data.result) {
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:15px; display:block; box-shadow:0 4px 15px rgba(0,0,0,0.3);">`;
        }
    } catch (e) { container.innerHTML = "<p style='color:white;'>Error swapping cloth. Try again.</p>"; }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };