const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?", "My guy, what are you looking for today?", 
    "Classic Babe, what are you looking for today?", "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?", "Chief, looking for premium native?", 
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhoto = ""; 
let selectedCloth = null; 
let detectedGender = "male";
let selectedBodyType = "slim";

// 1. FAST HYPE
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

// 2. SEARCH & TRIGGER
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        selectedCloth = matched[0];
        detectedGender = input.match(/ankara|dinner|nne|babe|baddie/) ? "female" : "male";
        document.getElementById('body-type-selector').style.display = (detectedGender === "female") ? "block" : "none";
        
        results.innerHTML = matched.map(item => `
            <div class="result-card">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';
        setTimeout(() => { document.getElementById('fitting-room-modal').style.display = 'flex'; }, 2000);
    }
};

window.setBodyType = (type) => {
    selectedBodyType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase() === type));
};

// AUTO-OPTIMIZER: Shrinks photo to keep things fast
window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Convert to low-weight JPG for the AI server
            userPhoto = canvas.toDataURL('image/jpeg', 0.7); 
            
            const btn = document.getElementById('fit-action-btn');
            btn.innerText = "Rock your cloth";
            btn.onclick = startModeling;
        };
    };
    reader.readAsDataURL(file);
};

// 3. THE "STRICT" AI MODELING LOGIC
async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const subtext = document.getElementById('modal-subtext');
    const btn = document.getElementById('fit-action-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    
    btn.style.display = 'none';
    subtext.innerText = "Connecting to AI Showroom Engine...";

    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img, gender: detectedGender })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Server Connection Busy");
        }

        const { predictionId } = await response.json();

        let checkInterval = setInterval(async () => {
            subtext.innerText = "Our AI Stylist is refining your look...";
            const check = await fetch(`/.netlify/functions/check-ai?id=${predictionId}`);
            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                subtext.style.display = 'none';
                if(cartBtn) cartBtn.style.display = 'block'; 
                resultArea.innerHTML = `
                    <div class="showroom-video-box">
                        <video autoplay loop muted playsinline class="modeling-video">
                            <source src="${result.videoUrl}" type="video/mp4">
                        </video>
                        <div class="user-identity-bubble"><img src="${userPhoto}" style="width:100%; height:100%; object-fit:cover;"></div>
                    </div>
                `;
            } else if (result.status === "failed") {
                clearInterval(checkInterval);
                throw new Error("AI could not map this photo.");
            }
        }, 3000);

    } catch (e) {
        handleAIFailure(resultArea, subtext, btn, e.message);
    }
}

function handleAIFailure(area, sub, btn, errorMsg) {
    sub.innerText = "Style Check in Progress";
    area.innerHTML = `
        <div style="padding:30px; background:#f9f9f9; border-radius:20px; text-align:center; border: 1px solid #ddd; color: #333;">
            <p style="font-weight:bold;">Refining your look...</p>
            <p style="font-size:0.85rem; margin-bottom:10px;">Our AI Stylist needs a clearer photo. Please try a front-facing selfie in good lighting.</p>
            <p style="font-size:0.7rem; color: #999;">Error log: ${errorMsg}</p>
        </div>
    `;
    btn.style.display = 'block';
    btn.innerText = "Try a Clearer Photo";
}

// 4. MIC, CART, & PROFILE 
window.addToCart = () => {
    const count = document.getElementById('cart-count');
    count.innerText = parseInt(count.innerText) + 1;
    alert(`${selectedCloth.name} added to cart!`);
};

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('modal-subtext').style.display = 'block';
    document.getElementById('fit-action-btn').style.display = 'block';
    document.getElementById('add-to-cart-btn').style.display = 'none';
};

window.quickSearch = (t) => { document.getElementById('ai-input').value = t; executeSearch(); };
window.onload = () => {
    const s = localStorage.getItem('kingsley_profile_locked');
    if (s) document.getElementById('owner-img').src = s;
};
window.handleProfileUpload = (e) => {
    const r = new FileReader();
    r.onload = () => { document.getElementById('owner-img').src = r.result; document.getElementById('save-btn').style.display = 'inline-block'; };
    r.readAsDataURL(e.target.files[0]);
};
window.saveProfileData = () => {
    localStorage.setItem('kingsley_profile_locked', document.getElementById('owner-img').src);
    document.getElementById('save-btn').style.display = 'none';
};
window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
};