/**
 * Kingsley Mall - v21.0 (RESTORATION MASTER)
 * 1. FIXED: Send button is always visible and functional.
 * 2. FIXED: UI scattering and alignment.
 * 3. FEATURE: Still-photo VTO swap.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" }
];

let userPhoto = "";
let selectedCloth = null;

document.addEventListener('DOMContentLoaded', () => {
    // FORCE SEARCH & SEND BUTTON VISIBILITY
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) searchBar.style.display = 'flex';

    // MIC LOGIC
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

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!results) return;

    const matched = clothesCatalog.filter(i => i.name.toLowerCase().includes(input));
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" style="width:100%; border-radius:10px;">
                <h4 style="margin:10px 0;">${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button id="vto-start-btn" class="primary-btn" style="background:#e60023; color:white; width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer;">📸 See How You Look (Photo)</button>
    `;
    document.getElementById('vto-start-btn').onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startSwapNow();
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.startSwapNow = async () => {
    const container = document.getElementById('video-main-container');
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    
    container.innerHTML = `<div style="color:white;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Wearing your ${selectedCloth.name}...</p></div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        if (data.result) {
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block;">`;
        }
    } catch (e) {
        container.innerHTML = "<p style='color:white;'>Error swapping cloth. Please try again.</p>";
    }
};