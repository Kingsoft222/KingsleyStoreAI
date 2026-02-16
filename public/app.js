/**
 * Kingsley Store AI - Core Logic v42.0
 * PERMANENT SPINNER: Countdown locked inside circle.
 * FINAL HANDSHAKE: Scans for binary image signatures to fix the Broken Icon.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;
let cartCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved && document.getElementById('owner-img')) {
        document.getElementById('owner-img').src = saved;
        userPhoto = saved;
    }
});

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        document.getElementById('owner-img').src = userPhoto;
        localStorage.setItem('kingsley_profile_locked', userPhoto);
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim() || !results) return;
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%; font-weight:800; cursor:pointer;">📸 UPLOAD PHOTO</button>
    `;
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startVertexModeling();
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- THE LOCKED ENGINE ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    aiResultPending = null; 

    // SPINNER + COUNTDOWN (PERMANENT PATTERN)
    container.innerHTML = `
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin fa-4x" style="color:#e60023; position:absolute;"></i>
                <div id="countdown-timer" style="font-size:2rem; font-weight:900; color:white; z-index:10;">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:30px; text-transform:uppercase; letter-spacing:2px;">Unveiling Look</h3>
            <p style="color:#666; font-size:0.9rem; margin-top:10px;">Tailoring your ${selectedCloth.name}...</p>
        </div>
    `;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (aiResultPending) window.injectFinalResult(aiResultPending);
        }
    }, 1000);

    try {
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        const data = await response.json();

        if (data.result && data.result.length > 500) {
            aiResultPending = data.result;
            if (timeLeft <= 0) window.injectFinalResult(aiResultPending);
        }
    } catch (e) {
        clearInterval(timerInterval);
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">Handshake Error.</div>`;
    }
};

window.injectFinalResult = (dataStr) => {
    const container = document.getElementById('video-main-container');
    
    // BINARY SIGNATURE SCAN (THE FIX)
    const signatures = [
        { sig: "iVBORw0KGgo", mime: "image/png" },
        { sig: "/9j/4", mime: "image/jpeg" },
        { sig: "UklGR", mime: "image/webp" }
    ];

    let detectedMime = "image/png";
    let startPos = -1;

    for (const s of signatures) {
        const pos = dataStr.indexOf(s.sig);
        if (pos !== -1) { startPos = pos; detectedMime = s.mime; break; }
    }

    let cleanData = (startPos !== -1) ? dataStr.substring(startPos) : dataStr;
    cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");

    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:200000;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:100px;">
                <img src="data:${detectedMime};base64,${cleanData}" 
                     style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 20px 50px 20px; background:linear-gradient(transparent, #000 70%); display:flex; flex-direction:column; align-items:center; z-index:200001;">
                <button style="background:#e60023; color:white; width:100%; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="location.reload()">
                    ADD TO CART - ${selectedCloth.price} 🛒
                </button>
            </div>
        </div>
    `;
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };