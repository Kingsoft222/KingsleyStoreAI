/**
 * Kingsley Store AI - v55.0 "The Master Slicer"
 * FIX: Steady Broken Image by slicing exact binary markers.
 * RESTORED: Full Search & Send logic.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = ["Chief, looking for premium native?", "Boss, let's find your style!"];
let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;

// --- 1. BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) userPhoto = saved;
});

// --- 2. SEARCH ENGINE (SEND ICON ACTIVE) ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim() || !results) return;
    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input));
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    }
};

// --- 3. THE ENGINE ---
window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        userPhoto = event.target.result; // Base64
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
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin fa-4x" style="color:#e60023; position:absolute;"></i>
                <div id="countdown-timer" style="font-size:2rem; font-weight:900; color:white; z-index:10;">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:30px;">TAILORING...</h3>
        </div>
    `;

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
                clothName: selectedCloth.name 
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
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>RETRYING...</h3><button onclick="location.reload()">REFRESH</button></div>`;
        return;
    }

    // THE MASTER SLICER: Hunt for PNG (iVBOR) or JPEG (/9j/4)
    let cleanData = aiResultPending;
    const pngMarker = "iVBORw0KGgo";
    const jpgMarker = "/9j/4";
    
    let startIdx = cleanData.indexOf(pngMarker);
    if (startIdx === -1) startIdx = cleanData.indexOf(jpgMarker);
    
    // If we found a marker, slice EVERYTHING before it
    if (startIdx !== -1) {
        cleanData = cleanData.substring(startIdx);
    }

    // Remove any trailing text or symbols
    cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");

    const byteCharacters = atob(cleanData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' }); 
    const blobUrl = URL.createObjectURL(blob);

    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="${blobUrl}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 20px 60px; background:linear-gradient(transparent, #000 70%); display:flex; flex-direction:column; align-items:center;">
                <button style="background:#e60023; color:white; width:100%; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none;" onclick="location.reload()">ADD TO CART 🛒</button>
            </div>
        </div>
    `;
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `<button onclick="document.getElementById('user-fit-input').click()" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%; font-weight:800; cursor:pointer;">📸 UPLOAD PHOTO</button>`;
};
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };