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
let userModelImg = ""; 

// 1. FAST HYPE ROTATION (1 Second)
function fastCycleHype() {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}
setInterval(fastCycleHype, 1000); 

// 2. PROFILE & SEARCH
window.onload = () => {
    const savedImg = localStorage.getItem('kingsley_profile_locked');
    if (savedImg) document.getElementById('owner-img').src = savedImg;
};

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.innerHTML = matched.map(item => `
            <div class="result-card">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';

        // FAST POP-UP (2 Seconds)
        setTimeout(() => {
            document.getElementById('fitting-room-modal').style.display = 'flex';
        }, 2000);

    } else {
        results.innerHTML = "<p>No results found.</p>";
        results.style.display = 'grid';
    }
};

window.quickSearch = (term) => {
    document.getElementById('ai-input').value = term;
    executeSearch();
};

// 3. AI FITTING ROOM: MODELING LOGIC
window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userModelImg = event.target.result; 
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Rock your cloth";
        btn.style.background = "#28a745";
        btn.onclick = startModeling;
    };
    reader.readAsDataURL(e.target.files[0]);
};

function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const btn = document.getElementById('fit-action-btn');
    const subtext = document.getElementById('modal-subtext');

    btn.style.display = 'none';
    subtext.innerText = "Styling you in the showroom...";

    setTimeout(() => {
        subtext.innerText = "Looking sharp, Chief!";
        resultArea.innerHTML = `
            <div class="showroom-bg">
                <img src="${userModelImg}" class="customer-modeling">
            </div>
        `;
    }, 1500);
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
};

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
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