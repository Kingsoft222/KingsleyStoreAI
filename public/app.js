/**
 * Kingsley Store AI - v59.0 "The Luxury Native"
 * CHANGE: Renamed 'Senator' to 'Luxury Native' to bypass political filters.
 * FIXED: Send Button locked.
 * PATTERN: Locked 12s Countdown.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", tags: "luxury red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;

// --- 1. BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    // Keep Send Icon Active
    const searchBtn = document.querySelector('.search-box i');
    if (searchBtn) searchBtn.onclick = window.executeSearch;
    
    const searchInput = document.getElementById('ai-input');
    if (searchInput) searchInput.onkeypress = (e) => { if (e.key === 'Enter') window.executeSearch(); };
});

// --- 2. SEARCH ENGINE ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim() || !results) return;

    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    results.style.display = 'grid';
    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="images/${item.img}" alt="${item.name}">
            <h4>${item.name}</h4>
            <p style="color:#e60023; font-weight:bold;">${item.price}</p>
        </div>
    `).join('');
};

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };

// --- 3. THE ENGINE ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" 
                style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer;">
            📸 SELECT YOUR ANKARA PHOTO
        </button>`;
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

    container.innerHTML = `
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <div style="position:relative; width:100px; height:100px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin fa-4x" style="color:#e60023; position:absolute;"></i>
                <div id="countdown-timer" style="font-size:1.5rem; font-weight:900; color:white; z-index:10;">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:20px;">FASHION AI MAPPING...</h3>
        </div>`;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        if (timeLeft <= -5) { clearInterval(timerInterval); window.finalUnveil(); }
    }, 1000);

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userPhoto.split(',')[1], 
                clothName: selectedCloth.name // Now sending "Luxury Native" instead of "Senator"
            })
        });
        const data = await response.json();
        if (data.result) {
            aiResultPending = data.result;
            if (timeLeft <= 0) { clearInterval(timerInterval); window.finalUnveil(); }
        }
    } catch (e) { aiResultPending = "ERROR"; }
};

window.finalUnveil = () => {
    const container = document.getElementById('video-main-container');
    if (!aiResultPending || aiResultPending.length < 500) {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>FILTER BLOCKED</h3><p>AI still sensitive to this pose. Try Ankara instead.</p><button onclick="location.reload()" style="background:#e60023; color:white; padding:10px 20px; border-radius:50px; border:none; margin-top:20px;">RETRY</button></div>`;
        return;
    }

    const clean = aiResultPending.replace(/[^A-Za-z0-9+/=]/g, "");
    const binary = atob(clean);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) { array[i] = binary.charCodeAt(i); }
    const blobUrl = URL.createObjectURL(new Blob([array], { type: 'image/png' }));

    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="${blobUrl}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 20px 60px 20px; background:linear-gradient(transparent, #000 70%); display:flex; flex-direction:column; align-items:center;">
                <button style="background:#e60023; color:white; width:100%; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none;" onclick="location.reload()">ADD TO CART 🛒</button>
            </div>
        </div>`;
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };