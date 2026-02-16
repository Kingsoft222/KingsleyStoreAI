/**
 * Kingsley Store AI - Core Logic v23.0
 * DETECTIVE EDITION: Logs everything to console.
 * FIXED: Manual Base64 rebuilding and error trapping.
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

// --- 2. THE ENGINE (THE DETECTIVE FIX) ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // PROFESSIONAL CIRCLE SPINNER
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000;">
            <i class="fas fa-circle-notch fa-spin fa-3x" style="color:#e60023; margin-bottom:20px;"></i>
            <p>Tailoring Result...</p>
        </div>
    `;

    try {
        const rawBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;
        
        console.log("Sending request to process-vto...");
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: rawBase64, cloth: selectedCloth.name })
        });
        
        const data = await response.json();
        console.log("AI Response Received:", data);

        if (data.result && data.result.length > 100) {
            // NUCLEAR CLEANUP
            const rawData = data.result
                .replace(/^data:image\/[a-z]+;base64,/, "")
                .replace(/```[a-z]*/g, "")
                .replace(/```/g, "")
                .replace(/\s/g, "");

            const finalSrc = "data:image/png;base64," + rawData;

            container.innerHTML = `
                <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; z-index:100000;">
                    <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                        <img src="${finalSrc}" 
                             style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
                    </div>
                    
                    <div style="position:absolute; bottom:0; left:0; width:100%; padding:20px 20px 50px 20px; background:linear-gradient(transparent, #000); display:flex; flex-direction:column; align-items:center; box-sizing:border-box;">
                        <button style="background:#e60023; color:white; width:100%; max-width:400px; height:65px; border-radius:50px; font-weight:bold; font-size:1.2rem; border:none; cursor:pointer;" onclick="window.addToCart()">
                            ADD TO CART - ${selectedCloth.price} 🛒
                        </button>
                        <p onclick="location.reload()" style="color:#888; margin-top:15px; cursor:pointer; font-size:0.9rem; text-decoration: underline;">Try another design</p>
                    </div>
                </div>
            `;
        } else {
            console.error("Invalid AI Data:", data.result);
            throw new Error("AI sent empty or short string.");
        }
    } catch (e) {
        console.error("Modeling Error:", e);
        container.innerHTML = `
            <div style="color:white; padding:50px; text-align:center;">
                <p>⚠️ The AI is being stubborn. Please try a clearer photo.</p>
                <button onclick="location.reload()" style="margin-top:20px; background:#333; color:white; border:none; padding:10px 20px; border-radius:10px;">Retry</button>
            </div>`;
    }
};

window.addToCart = () => {
    cartCount++;
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = cartCount;
    alert("Added to bag! ✅");
};

// Search Logic
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
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%;">📸 Select Photo</button>
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