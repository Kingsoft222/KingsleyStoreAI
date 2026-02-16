/**
 * Kingsley Store AI - Core Logic v40.0
 * ZERO-HOUR EDITION: Forced image injection at T-minus 0.
 * FIXED: Indefinite loading by sync-locking the timer and the AI result.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;

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

// --- 2. THE ZERO-HOUR ENGINE ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    aiResultPending = null; // Reset for new run

    // RENDER SPINNER + PROGRESSIVE COUNTDOWN
    container.innerHTML = `
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <div style="position:relative; width:100px; height:100px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin fa-3x" style="color:#e60023; position:absolute;"></i>
                <div id="countdown-timer" style="font-size:1.5rem; font-weight:900; color:white; z-index:10;">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:20px; text-transform:uppercase; letter-spacing:2px;">Unveiling Look</h3>
            <p style="color:#666; font-size:0.8rem; margin-top:10px;">Tailoring your ${selectedCloth.name}...</p>
        </div>
    `;

    // START THE CLOCK
    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // ZERO HOUR REACHED: If data is here, show it. If not, wait 2 more seconds then show whatever we have.
            if (aiResultPending) {
                window.injectFinalResult(aiResultPending);
            } else {
                setTimeout(() => { if (aiResultPending) window.injectFinalResult(aiResultPending); }, 2000);
            }
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
            aiResultPending = data.result; // Store data, let the timer decide when to unveil
            
            // If the timer is already at zero, inject immediately
            if (timeLeft <= 0) {
                window.injectFinalResult(aiResultPending);
            }
        }
    } catch (e) {
        clearInterval(timerInterval);
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">Handshake Error. Please retry.</div>`;
    }
};

window.injectFinalResult = (dataStr) => {
    const container = document.getElementById('video-main-container');
    
    // DATA SCRUBBING
    let type = "image/png";
    if (dataStr.includes("/9j/")) type = "image/jpeg";
    else if (dataStr.includes("UklGR")) type = "image/webp";

    const markers = ["iVBOR", "/9j/", "UklGR"];
    let start = -1;
    for (let m of markers) {
        let found = dataStr.indexOf(m);
        if (found !== -1) { start = found; break; }
    }
    let cleanData = (start !== -1) ? dataStr.substring(start) : dataStr;
    cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");

    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="data:${type};base64,${cleanData}" 
                     style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:30px 20px 60px; background:linear-gradient(transparent, #000 60%); display:flex; flex-direction:column; align-items:center; z-index:100;">
                <button style="background:#e60023; color:white; width:100%; max-width:420px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="location.reload()">
                    ADD TO CART - ${selectedCloth.price} 🛒
                </button>
            </div>
        </div>
    `;
};

// ... Remaining Search & Modal Close logic remains the same ...
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
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };