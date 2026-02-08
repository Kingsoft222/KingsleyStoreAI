const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?",
    "My guy, what are you looking for today?",
    "Classic babe, what are you looking for today?",
    "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhoto = ""; 
let selectedClothImg = ""; 

// 1. FAST HYPE (1 Second)
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

// 2. SEARCH LOGIC
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        selectedClothImg = `images/${matched[0].img}`; 
        results.innerHTML = matched.map(item => `
            <div class="result-card">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';

        // 2-SECOND POPUP
        setTimeout(() => {
            document.getElementById('fitting-room-modal').style.display = 'flex';
        }, 2000);
    }
};

window.quickSearch = (term) => {
    document.getElementById('ai-input').value = term;
    executeSearch();
};

// 3. FULL MODELING LOGIC (NO CROP)
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
    const subtext = document.getElementById('modal-subtext');
    
    btn.style.display = 'none';
    subtext.innerText = "Generating your full modeling look...";

    setTimeout(() => {
        subtext.innerText = "Perfect fit! You look amazing.";
        resultArea.innerHTML = `
            <div class="showroom-bg">
                <div class="model-wrapper">
                    <img src="${userPhoto}" class="customer-img">
                    <img src="${selectedClothImg}" class="worn-cloth-overlay">
                </div>
            </div>
        `;
    }, 1500);
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    const btn = document.getElementById('fit-action-btn');
    btn.innerText = "Upload Photo";
    btn.style.display = 'block';
};

// Profile logic
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