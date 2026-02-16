/**
 * Kingsley Store AI - Core Logic v35.0
 * THE UNVEILING: Universal Multimodal Decoder.
 * FIXED: The "Broken Icon" by auto-detecting JPEG/PNG/WebP formats.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;
let cartCount = 0;

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

// --- 2. THE ENGINE (UNIVERSAL DECODER) ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center; padding:20px;">
            <i class="fas fa-circle-notch fa-spin fa-3x" style="color:#e60023; margin-bottom:20px;"></i>
            <h3 style="font-weight:800; font-family:'Inter', sans-serif;">UNVEILING YOUR LOOK</h3>
            <p style="color:#888; font-size:0.85rem; margin-top:10px;">Decoding AI Pixels (~11s)...</p>
        </div>
    `;

    try {
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        const data = await response.json();

        if (data.result && data.result.length > 1000) {
            let cleanData = data.result;

            // 1. AUTO-DETECT IMAGE TYPE
            let mimeType = "image/png"; // Default
            if (cleanData.includes("/9j/")) mimeType = "image/jpeg";
            else if (cleanData.includes("UklGR")) mimeType = "image/webp";

            // 2. FIND ACTUAL START (Cut conversational junk)
            const markers = ["iVBORw0KGgo", "/9j/", "UklGR"];
            let start = -1;
            for (let m of markers) {
                let found = cleanData.indexOf(m);
                if (found !== -1) { start = found; break; }
            }
            
            if (start !== -1) cleanData = cleanData.substring(start);

            // 3. SCRUB ALL NON-BASE64 CHARACTERS
            cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");

            container.innerHTML = `
                <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; z-index:100000; overflow:hidden;">
                    <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                        <img src="data:${mimeType};base64,${cleanData}" 
                             style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
                    </div>
                    <div style="position:absolute; bottom:0; left:0; width:100%; padding:20px 20px 60px 20px; background:linear-gradient(transparent, #000 40%); display:flex; flex-direction:column; align-items:center; box-sizing:border-box; z-index:101;">
                        <button style="background:#e60023; color:white; width:100%; max-width:400px; height:65px; border-radius:50px; font-weight:800; font-size:1.2rem; border:none; cursor:pointer;" onclick="window.addToCart()">
                            ADD TO CART - ${selectedCloth.price} 🛒
                        </button>
                        <p onclick="location.reload()" style="color:#777; margin-top:15px; cursor:pointer; font-size:0.9rem; text-decoration:underline;">Try another</p>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;">AI Decode Error. Please Refresh.</div>`;
    }
};

window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    alert("Oshey! Added to bag. ✅");
};

// UI Logic
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
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%; font-weight:800;">📸 SELECT PHOTO</button>
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

window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };