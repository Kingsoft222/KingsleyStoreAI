/**
 * Kingsley Store AI - Core Logic v39.0
 * THE BURNER EDITION: Includes 12s Countdown & Forced Injection.
 * FIXED: Indefinite loading and broken icons by bypassing standard img.onload.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;

// --- 1. BOOTSTRAP ---
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

// --- 2. THE ENGINE (WITH COUNTDOWN) ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // RENDER SPINNER + COUNTDOWN
    container.innerHTML = `
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <i class="fas fa-circle-notch fa-spin fa-3x" style="color:#e60023; margin-bottom:20px;"></i>
            <h3 style="font-weight:800; font-family:'Inter', sans-serif;">SEWING YOUR LOOK</h3>
            <div id="countdown-timer" style="font-size:2.5rem; font-weight:900; color:#e60023; margin:15px 0;">12</div>
            <p style="color:#666; font-size:0.85rem;">Tailoring takes time. Stay with us...</p>
        </div>
    `;

    // START COUNTDOWN LOGIC
    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);

    try {
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        const data = await response.json();

        if (data.result && data.result.length > 500) {
            clearInterval(timerInterval); // Stop timer when data arrives

            let cleanData = data.result;
            let type = "image/png";
            if (cleanData.includes("/9j/")) type = "image/jpeg";
            else if (cleanData.includes("UklGR")) type = "image/webp";

            const markers = ["iVBOR", "/9j/", "UklGR"];
            let start = -1;
            for (let m of markers) {
                let found = cleanData.indexOf(m);
                if (found !== -1) { start = found; break; }
            }
            if (start !== -1) cleanData = cleanData.substring(start);
            cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");

            // FORCED INJECTION: We build the entire result screen at once
            container.innerHTML = `
                <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden;">
                    <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                        <img src="data:${type};base64,${cleanData}" 
                             style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
                    </div>
                    <div style="position:absolute; bottom:0; width:100%; padding:30px 20px 60px; background:linear-gradient(transparent, #000); display:flex; flex-direction:column; align-items:center; z-index:100;">
                        <button style="background:#e60023; color:white; width:100%; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="location.reload()">
                            ADD TO CART - ${selectedCloth.price} 🛒
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        clearInterval(timerInterval);
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">Handshake Error. Please retry.</div>`;
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%; font-weight:800;">📸 UPLOAD PHOTO</button>
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

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(item => item.name.toLowerCase().includes(input));
    if (matched.length > 0 && results) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}">
                <h4>${item.name}</h4>
                <p style="color:#e60023;">${item.price}</p>
            </div>
        `).join('');
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };