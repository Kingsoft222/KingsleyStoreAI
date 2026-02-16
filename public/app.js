/**
 * Kingsley Store AI - Core Logic v36.0
 * THE DEEP DIVE: Multimodal Surgeon Edition.
 * FIXED: The 11s "Broken Icon" by scanning for binary image signatures.
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

// --- 2. THE SURGEON ENGINE ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <div class="pro-spinner"></div>
            <h3 style="margin-top:20px; font-weight:800;">UNVEILING YOUR Senator...</h3>
            <p style="color:#666; font-size:0.8rem;">Processing AI Pixels...</p>
        </div>
    `;

    try {
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        const data = await response.json();

        if (data.result) {
            let cleanData = data.result;

            // SURGEON LOGIC: Scan for image signatures (PNG, JPG, WebP)
            const signatures = [
                { sig: "iVBORw0KGgo", mime: "image/png" },
                { sig: "/9j/4", mime: "image/jpeg" },
                { sig: "UklGR", mime: "image/webp" }
            ];

            let detectedMime = "image/png";
            let startPos = -1;

            for (const item of signatures) {
                const pos = cleanData.indexOf(item.sig);
                if (pos !== -1) {
                    startPos = pos;
                    detectedMime = item.mime;
                    break;
                }
            }

            if (startPos !== -1) {
                cleanData = cleanData.substring(startPos);
            }

            // Remove any trailing markdown backticks or non-base64 noise
            cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");

            container.innerHTML = `
                <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden;">
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                        <img src="data:${detectedMime};base64,${cleanData}" 
                             style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
                    </div>
                    <div style="position:absolute; bottom:0; width:100%; padding:30px 20px 60px; background:linear-gradient(transparent, #000); display:flex; flex-direction:column; align-items:center;">
                        <button style="background:#e60023; color:white; width:100%; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="location.reload()">
                            ADD TO CART - ${selectedCloth.price} 🛒
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">AI Handshake Error.</div>`;
    }
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

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%;">📸 UPLOAD PHOTO</button>
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