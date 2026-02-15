/**
 * Kingsley Store AI - Core Logic v18.0
 * CLEAN HOOD EDITION: Zero branding, zero share buttons.
 * UI: Professional Spinner -> Full Screen Image -> Add to Cart.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?", "My guy, what are you looking for today?",
    "Classic Man, what are you looking for today?", "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhoto = "";
let selectedCloth = null;
let cartCount = 0;

// --- 1. BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2000);

    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
            rec.onresult = (e) => {
                document.getElementById('ai-input').value = e.results[0][0].transcript;
                micBtn.style.color = "#5f6368";
                window.executeSearch();
            };
        }
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

// --- 2. SEARCH ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim() || !results) return;

    const matched = clothesCatalog.filter(item =>
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// --- 3. SHOWROOM ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; width:100%; border-radius:50px; padding:15px; border:none; cursor:pointer;">📸 Upload Photo</button>
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

// --- 4. THE CLEAN ENGINE ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // RESTORED PROFESSIONAL CIRCLE SPINNER
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; color:white; background:#000;">
            <i class="fas fa-circle-notch fa-spin fa-3x" style="margin-bottom:20px; color:#e60023;"></i>
            <p>Processing Try-On...</p>
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
            // DATA SANITIZATION: Clean any AI junk
            const cleanImage = data.result.replace(/```[a-z]*/g, "").replace(/```/g, "").trim();

            container.innerHTML = `
                <div style="width:100%; height:100vh; display:flex; flex-direction:column; background:#000;">
                    <div style="flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <img src="data:image/png;base64,${cleanImage}" style="width:100%; height:100%; object-fit:contain;">
                    </div>
                    
                    <div style="padding:20px 20px 40px 20px; background:rgba(0,0,0,0.9); display:flex; flex-direction:column; align-items:center;">
                        <button class="primary-btn" style="background:#e60023; color:white; width:100%; height:60px; border-radius:50px; font-weight:bold; font-size:1.1rem; border:none; cursor:pointer;" onclick="window.addToCart()">
                            ADD TO CART - ${selectedCloth.price} 🛒
                        </button>
                        <p onclick="location.reload()" style="color:#666; cursor:pointer; font-size:0.9rem; margin-top:15px;">Try another design</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">AI Error. Please refresh and try again.</div>`;
        }
    } catch (e) {
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">Network error. Check logs.</div>`;
    }
};

window.addToCart = () => {
    cartCount++;
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = cartCount;
    alert(`${selectedCloth.name} added to bag!`);
};

window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };