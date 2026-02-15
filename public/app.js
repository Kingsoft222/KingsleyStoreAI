/**
 * Kingsley Store AI - v11.0 (VERTEX STILL-PHOTO EDITION)
 * 1. Immediate Save Button reflection on upload.
 * 2. Vertex AI Still Photo Swap (No movement/animations).
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = ["Nne, what's your style?", "My guy, what's the vibe?", "Chief, looking for premium?", "Baddie, let's shop!"];
let gIndex = 0;
let userPhoto = "";
let selectedCloth = null;
let cartCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { document.getElementById('owner-img').src = saved; userPhoto = saved; }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2000);
});

// --- GOAL 1: INSTANT BUTTON REFLECTION ---
window.handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const imgData = event.target.result;
        document.getElementById('owner-img').src = imgData;
        localStorage.setItem('kingsley_profile_locked', imgData);
        userPhoto = imgData;

        // FORCE BUTTON REFLECTION IMMEDIATELY
        const saveBtn = document.getElementById('fit-action-btn');
        if (saveBtn) {
            saveBtn.style.display = 'block';
            saveBtn.innerText = "Profile Photo Uploaded ✅";
            saveBtn.style.background = "#28a745";
            saveBtn.style.color = "white";
            // Hide after 3 seconds to keep UI clean
            setTimeout(() => { saveBtn.style.display = 'none'; }, 3000);
        }
    };
    reader.readAsDataURL(file);
};

// --- GOAL 2: VERTEX STILL PHOTO SWAP ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(i => i.name.toLowerCase().includes(input) || i.tags.toLowerCase().includes(input));
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
        <button id="photo-vto-trigger" class="primary-btn" style="background:#e60023; color:white; width:100%; padding:15px; border-radius:12px; border:none; font-weight:bold;">📸 See How You Look (Photo)</button>
    `;
    document.getElementById('photo-vto-trigger').onclick = window.initiateUploadFlow;
};

window.initiateUploadFlow = () => {
    const fitBtn = document.getElementById('fit-action-btn');
    fitBtn.style.display = 'block';
    fitBtn.innerText = "Upload Modeling Photo";
    fitBtn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Swap My Outfit";
        btn.onclick = window.startVertexModeling;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `<div style="color:white;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Sewing Your Still Fit...</p></div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        
        if (data.result) {
            // DISPLAY STILL PHOTO (NO ANIMATION)
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:24px; display:block;">`;
            
            document.getElementById('video-bottom-section').innerHTML = `
                <button onclick="window.addToCart()" class="primary-btn" style="background:#28a745; color:white; width:280px; margin-top:20px; border-radius:12px; padding:15px; border:none;">Add to Cart 🛒</button>
            `;
        }
    } catch (e) {
        container.innerHTML = "<p style='color:white;'>Error. Try again.</p>";
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };

window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
};