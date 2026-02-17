/**
 * Kingsley Store AI - v85.0 "Dynamic Unveil"
 * FIX: Dynamic loading text based on countdown triggers (5s and 2s).
 * FIX: Matches Binary Backend with isBase64Encoded: true.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", tags: "luxury red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;

document.addEventListener('DOMContentLoaded', () => {
    const icon = document.querySelector('.search-box i');
    if (icon) icon.onclick = (e) => { e.preventDefault(); window.executeSearch(); };
});

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input || !results) return;
    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input));
    
    results.style.display = 'grid';
    results.style.gridTemplateColumns = 'repeat(2, 1fr)';
    results.style.gap = '12px';
    results.style.padding = '10px';

    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="background:#111; border-radius:12px; overflow:hidden; text-align:center; padding-bottom:10px; border:1px solid #222;">
            <img src="images/${item.img}" style="width:100%; height:160px; object-fit:cover;">
            <h4 style="font-size:0.85rem; margin:8px; color:white; font-weight:600;">${item.name}</h4>
            <p style="color:#e60023; font-weight:900;">${item.price}</p>
        </div>`).join('');
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" 
                style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer;">
            📸 SELECT STANDING PHOTO
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

// --- DYNAMIC LOADING ENGINE ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');

    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#000; color:white; text-align:center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin" style="color:#e60023; font-size: 4rem;"></i>
                <div id="countdown-timer" style="position:absolute; font-size:1.6rem; font-weight:900; top:50%; left:50%; transform:translate(-50%, -50%);">12</div>
            </div>
            <h3 id="loading-status-text" style="margin-top:25px; font-weight:800; letter-spacing:1px; text-transform:uppercase;">STITCHING NATIVE...</h3>
        </div>`;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        const statusText = document.getElementById('loading-status-text');
        
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        
        // Dynamic Status Updates
        if (statusText) {
            if (timeLeft === 5) {
                statusText.innerText = "Dressing You...";
            } else if (timeLeft === 2) {
                statusText.innerText = "Unveiling Your Look...";
            }
        }
    }, 1000);

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], clothName: selectedCloth.name })
        });
        
        if (!response.ok) throw new Error("Server Error");

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        clearInterval(timerInterval);
        window.displayFinalAnkara(imageUrl);
    } catch (e) {
        clearInterval(timerInterval);
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>SYSTEM ERROR</h3><button onclick="location.reload()" style="background:#e60023; color:white; border:none; padding:12px 25px; border-radius:50px; margin-top:20px;">RETRY</button></div>`;
    }
};

window.displayFinalAnkara = (url) => {
    const container = document.getElementById('video-main-container');
    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="${url}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 0 60px 0; background:linear-gradient(transparent, #000 70%); display:flex; justify-content:center; align-items:center;">
                <button style="background:#e60023; color:white; width:90vw; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none;" onclick="location.reload()">ADD TO CART 🛒</button>
            </div>
        </div>`;
};