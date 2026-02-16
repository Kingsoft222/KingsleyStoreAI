/**
 * Kingsley Store AI - Core Logic v27.0
 * THE TONGUE-CUTTER: Fixed the "Okay, here is your image" conversational error.
 * UI: Professional Spinner -> Clean Image -> Add to Cart.
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

// --- 2. THE ENGINE (THE CONVERSATIONAL FIX) ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000;">
            <i class="fas fa-circle-notch fa-spin fa-3x" style="color:#e60023; margin-bottom:20px;"></i>
            <p style="font-family: 'Inter', sans-serif; font-weight:600;">Tailoring your look...</p>
        </div>
    `;

    try {
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
        
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        
        const data = await response.json();

        if (data.result) {
            let cleanData = data.result;

            // THE TONGUE-CUTTER FIX:
            // Find the first occurrence of "iVBOR" (Standard PNG start) or "/9j/" (Standard JPEG start)
            // This ignores all the "Okay, here is your image" rubbish at the start.
            const pngStart = cleanData.indexOf("iVBOR");
            const jpgStart = cleanData.indexOf("/9j/");
            
            let startIndex = -1;
            if (pngStart !== -1) startIndex = pngStart;
            else if (jpgStart !== -1) startIndex = jpgStart;

            if (startIndex !== -1) {
                cleanData = cleanData.substring(startIndex);
            }

            // Standard Scrub for markdown and whitespace
            cleanData = cleanData.replace(/```[a-z0-9]*/gi, "").replace(/```/g, "").replace(/[^A-Za-z0-9+/=]/g, "");

            const finalSrc = "data:image/png;base64," + cleanData;

            container.innerHTML = `
                <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; z-index:100000; overflow:hidden;">
                    <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:140px;">
                        <img src="${finalSrc}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
                    </div>
                    <div style="position:absolute; bottom:0; left:0; width:100%; padding:30px 20px 60px 20px; background:linear-gradient(transparent, #000 40%); display:flex; flex-direction:column; align-items:center; box-sizing:border-box; z-index:10;">
                        <button style="background:#e60023; color:white; width:100%; max-width:420px; height:65px; border-radius:50px; font-weight:800; font-size:1.2rem; border:none; cursor:pointer;" onclick="window.addToCart()">
                            ADD TO CART - ${selectedCloth.price} 🛒
                        </button>
                        <p onclick="location.reload()" style="color:#888; margin-top:20px; cursor:pointer; font-size:0.9rem; text-decoration:underline;">Try another design</p>
                    </div>
                </div>
            `;
        } else {
            throw new Error("Empty result from AI");
        }
    } catch (e) {
        container.innerHTML = `
            <div style="color:white; padding:40px; text-align:center; background:#000; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <p style="font-size:1.2rem; color:#e60023; font-weight:bold;">⚠️ DATA FORMAT ERROR</p>
                <p style="color:#ccc; margin-top:10px;">The AI tried to talk instead of sending the image.</p>
                <button onclick="location.reload()" style="margin-top:30px; background:white; color:black; border:none; padding:15px 40px; border-radius:50px; font-weight:bold;">Retry Now</button>
            </div>`;
    }
};

window.addToCart = () => {
    cartCount++;
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = cartCount;
    alert("Success! Added to bag.");
};

// UI & Search logic remains clean
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
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%; font-weight:800;">📸 SELECT YOUR PHOTO</button>
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