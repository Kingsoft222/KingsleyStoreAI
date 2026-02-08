const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?",
    "My guy, what are you looking for today?",
    "Classic Babe, what are you looking for today?",
    "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?",
    "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhoto = ""; 
let selectedCloth = null; 

// 1. FAST HYPE (1 Second) - Confirmed
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

// 2. SEARCH LOGIC & 2-SECOND MODAL TRIGGER
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        selectedCloth = matched[0]; // Store full object for cart
        results.innerHTML = matched.map(item => `
            <div class="result-card">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';

        // 2-SECOND POPUP AS REQUESTED
        setTimeout(() => {
            document.getElementById('fitting-room-modal').style.display = 'flex';
        }, 2000);
    }
};

window.quickSearch = (term) => {
    document.getElementById('ai-input').value = term;
    executeSearch();
};

// 3. VIDEO MODELING LOGIC (The "Real" Implementation)
window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result; 
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Rock your cloth";
        btn.onclick = startModeling;
    };
    reader.readAsDataURL(e.target.files[0]);
};

function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const btn = document.getElementById('fit-action-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    const subtext = document.getElementById('modal-subtext');
    
    btn.style.display = 'none';
    subtext.innerText = "Processing your AI Modeling walk...";

    // Simulated AI Video Generation Delay
    setTimeout(() => {
        subtext.style.display = 'none'; // Remove "You look amazing" or subtext as requested
        if(cartBtn) cartBtn.style.display = 'block'; // Show Add to Cart

        resultArea.innerHTML = `
            <div class="showroom-video-box">
                <video class="modeling-video" autoplay loop muted playsinline>
                    <source src="videos/modeling_output.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                
                <div class="user-identity-bubble">
                    <img src="${userPhoto}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            </div>
        `;
    }, 2500);
}

// 4. ADD TO CART LOGIC
window.addToCart = () => {
    const cartCount = document.getElementById('cart-count');
    if (cartCount && selectedCloth) {
        let currentCount = parseInt(cartCount.innerText);
        cartCount.innerText = currentCount + 1;
        alert(`${selectedCloth.name} added to cart!`);
    }
};

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('modal-subtext').style.display = 'block';
    document.getElementById('modal-subtext').innerText = "Upload your full image to see yourself in this outfit";
    
    const btn = document.getElementById('fit-action-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    
    btn.innerText = "Upload Photo";
    btn.style.display = 'block';
    if(cartBtn) cartBtn.style.display = 'none';
};

// Profile Persistence Logic
window.onload = () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) document.getElementById('owner-img').src = saved;
};

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => { 
        document.getElementById('owner-img').src = reader.result; 
        document.getElementById('save-btn').style.display = 'inline-block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveProfileData = () => {
    localStorage.setItem('kingsley_profile_locked', document.getElementById('owner-img').src);
    document.getElementById('save-btn').style.display = 'none';
};

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
};