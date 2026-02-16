/**
 * Kingsley Store AI - Core Logic v19.0
 * MOBILE FIX: Forced Base64 Sanitation.
 * UI: Full-Screen Display with Pinned Footer.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;
let cartCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) {
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

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
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

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%;">📸 Select Your Photo</button>
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

// --- THE HOOD REPAIR ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; color:white; background:#000;">
            <i class="fas fa-circle-notch fa-spin fa-3x" style="color:#e60023; margin-bottom:20px;"></i>
            <p>Tailoring Result...</p>
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
            // AGGRESSIVE CLEANUP: Remove backticks, "base64" labels, and whitespace
            const cleanImage = data.result
                .replace(/```[a-z]*/g, "")
                .replace(/```/g, "")
                .replace(/data:image\/[a-z]+;base64,/g, "")
                .replace(/\s/g, "");

            container.innerHTML = `
                <div style="width:100%; height:100vh; display:flex; flex-direction:column; background:#000;">
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <img src="data:image/png;base64,${cleanImage}" style="width:100%; height:100%; object-fit:contain;">
                    </div>
                    <div style="padding:20px 20px 40px; background:rgba(0,0,0,0.9); display:flex; flex-direction:column; align-items:center;">
                        <button class="primary-btn" style="background:#e60023; color:white; width:100%; height:60px; border-radius:50px; font-weight:bold; border:none;" onclick="window.addToCart()">
                            ADD TO CART - ${selectedCloth.price} 🛒
                        </button>
                        <p onclick="location.reload()" style="color:#888; margin-top:15px; cursor:pointer; font-size:0.9rem;">Try another design</p>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">Network Error.</div>`;
    }
};

window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    alert("Added to bag!");
};

window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };