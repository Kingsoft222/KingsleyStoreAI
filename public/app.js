/**
 * Kingsley Store AI - v72.0 "High-Stability"
 * FIX: Blank screen by parsing JSON and using High-Stability Blobs.
 * UI: "Add to Cart" button perfectly centered.
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
    const icon = document.querySelector('.search-box i');
    if (icon) {
        icon.style.cursor = "pointer";
        icon.onclick = (e) => { e.preventDefault(); window.executeSearch(); };
    }
});

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input || !results) return;
    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input));
    results.style.display = 'grid';
    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
            <img src="images/${item.img}">
            <h4>${item.name}</h4>
            <p style="color:#e60023; font-weight:bold;">${item.price}</p>
        </div>`).join('');
};

// --- 2. THE ENGINE ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" 
                style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer;">
            📸 SELECT YOUR PHOTO
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
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin" style="color:#e60023; font-size: 5rem;"></i>
                <div id="countdown-timer" style="position:absolute; font-size:1.8rem; font-weight:900; color:white; top:50%; left:50%; transform:translate(-50%, -50%);">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:30px;">STITCHING ANKARA...</h3>
        </div>`;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        
        if (timeLeft <= 0 && aiResultPending) {
            clearInterval(timerInterval);
            window.finalUnveil();
        }
        if (timeLeft <= -15) { 
            clearInterval(timerInterval);
            window.finalUnveil();
        }
    }, 1000);

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], clothName: selectedCloth.name })
        });
        const data = await response.json();
        // Force extract the string even if nested
        aiResultPending = data.result || (data.body ? JSON.parse(data.body).result : null) || data;
    } catch (e) { 
        aiResultPending = "ERROR"; 
    }
};

window.finalUnveil = () => {
    const container = document.getElementById('video-main-container');
    if (!aiResultPending || aiResultPending === "ERROR") {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>RETRYING...</h3><button onclick="location.reload()" style="background:#e60023; color:white; padding:12px 25px; border-radius:50px; border:none; margin-top:20px;">REFRESH</button></div>`;
        return;
    }

    // THE HIGH-STABILITY SLICER
    let clean = (typeof aiResultPending === 'string') ? aiResultPending : JSON.stringify(aiResultPending);
    const markers = ["iVBORw0", "/9j/4"]; // PNG and JPEG headers
    let start = -1;
    for (let m of markers) {
        let pos = clean.indexOf(m);
        if (pos !== -1) { start = pos; break; }
    }
    
    if (start !== -1) clean = clean.substring(start);
    clean = clean.replace(/[^A-Za-z0-9+/=]/g, "");

    // THE BLOB ENGINE (Fixed Blank Screen)
    try {
        const binaryString = atob(clean);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);

        container.innerHTML = `
            <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
                <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                    <img src="${blobUrl}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
                </div>
                <div style="position:absolute; bottom:0; width:100%; padding:20px 0 60px 0; background:linear-gradient(transparent, #000 70%); display:flex; justify-content:center; align-items:center;">
                    <button style="background:#e60023; color:white; width:90vw; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="location.reload()">
                        ADD TO CART 🛒
                    </button>
                </div>
            </div>`;
    } catch (e) {
        // Fallback for older browsers
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>DISPLAY ERROR</h3><button onclick="location.reload()">RETRY</button></div>`;
    }
};