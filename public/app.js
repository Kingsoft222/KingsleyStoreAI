/**
 * Kingsley Store AI - v56.0 "The Unbreakable"
 * RESTORED: Send Icon, Search Chips, and Enter-Key support.
 * FIXED: Steady Broken Image using the Start-Marker Slicer.
 * PATTERN: Locked 12s Countdown Spinner.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = ["Chief, looking for premium native?", "Boss, let's find your style!", "Nne, let's find your style!"];
let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;

// --- 1. BOOTSTRAP & UI INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved && document.getElementById('owner-img')) {
        document.getElementById('owner-img').src = saved;
        userPhoto = saved;
    }

    // Auto-Greeting
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) el.innerText = greetings[Math.floor(Math.random() * greetings.length)];
    }, 3000);

    // Listen for Enter Key in search box
    const searchInput = document.getElementById('ai-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.executeSearch();
        });
    }
});

// --- 2. THE SEARCH ENGINE (SEND ICON FORCE) ---
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

// --- 3. VTO ENGINE ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    if (modal && resultArea) {
        modal.style.display = 'flex';
        resultArea.innerHTML = `
            <button onclick="document.getElementById('user-fit-input').click()" 
                    style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer; font-size:1rem;">
                📸 SELECT YOUR PHOTO
            </button>
        `;
    }
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startVertexModeling();
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    aiResultPending = null; 

    // YOUR PATTERN: SPINNER + COUNTDOWN
    container.innerHTML = `
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin fa-4x" style="color:#e60023; position:absolute;"></i>
                <div id="countdown-timer" style="font-size:2rem; font-weight:900; color:white; z-index:10;">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:30px; text-transform:uppercase; letter-spacing:2px;">Tailoring Look</h3>
            <p style="color:#666; font-size:0.9rem; margin-top:10px;">Mapping ${selectedCloth.name}...</p>
        </div>
    `;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        if (timeLeft <= -5) { 
            clearInterval(timerInterval);
            window.finalUnveil();
        }
    }, 1000);

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userPhoto.split(',')[1], 
                clothName: selectedCloth.name 
            })
        });
        const data = await response.json();
        if (data.result) {
            aiResultPending = data.result;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                window.finalUnveil();
            }
        }
    } catch (e) {
        aiResultPending = "ERROR";
    }
};

window.finalUnveil = () => {
    const container = document.getElementById('video-main-container');
    if (!aiResultPending || aiResultPending.length < 500) {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>AI TIMEOUT</h3><button onclick="location.reload()" style="background:#e60023; color:white; padding:10px 20px; border-radius:50px; border:none; margin-top:20px;">RETRY</button></div>`;
        return;
    }

    // THE SLICER: Cut AI talk
    let raw = aiResultPending;
    const markers = ["iVBOR", "/9j/", "UklGR"];
    let start = -1;
    for (let m of markers) {
        let pos = raw.indexOf(m);
        if (pos !== -1) { start = pos; break; }
    }
    
    let clean = (start !== -1) ? raw.substring(start) : raw;
    clean = clean.replace(/[^A-Za-z0-9+/=]/g, "");

    // Convert to Blob
    const binary = atob(clean);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) { array[i] = binary.charCodeAt(i); }
    const blobUrl = URL.createObjectURL(new Blob([array], { type: 'image/png' }));

    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="${blobUrl}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 20px 60px; background:linear-gradient(transparent, #000 70%); display:flex; flex-direction:column; align-items:center;">
                <button style="background:#e60023; color:white; width:100%; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="location.reload()">
                    ADD TO CART - ${selectedCloth.price} 🛒
                </button>
            </div>
        </div>
    `;
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };