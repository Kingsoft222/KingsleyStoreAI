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

// 1. FIXED HYPE ROTATION (3 Minutes)
function cycleHype() {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        el.style.opacity = "0";
        setTimeout(() => {
            gIndex = (gIndex + 1) % greetings.length;
            el.innerText = greetings[gIndex];
            el.style.opacity = "1";
        }, 800);
    }
}
setInterval(cycleHype, 180000); 

// 2. PROFILE LOGIC
window.onload = () => {
    const savedImg = localStorage.getItem('kingsley_profile_locked');
    if (savedImg) document.getElementById('owner-img').src = savedImg;
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

// 3. SEARCH & AI POP-UP TRIGGER (120000ms = 2 mins)
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

        // START 2-MINUTE TIMER FOR FITTING ROOM
        setTimeout(() => {
            document.getElementById('fitting-room-modal').style.display = 'flex';
        }, 120000);

    } else {
        results.innerHTML = "<p>No results found.</p>";
        results.style.display = 'grid';
    }
};

window.quickSearch = (term) => {
    document.getElementById('ai-input').value = term;
    executeSearch();
};

// 4. AI FITTING ROOM: ROCK YOUR CLOTH FLOW
window.handleUserFitUpload = (e) => {
    const btn = document.getElementById('fit-action-btn');
    btn.innerText = "Rock your cloth";
    btn.style.background = "#28a745"; // Success green
    btn.onclick = startAIAnimation;
};

function startAIAnimation() {
    const resultArea = document.getElementById('ai-fitting-result');
    const btn = document.getElementById('fit-action-btn');
    const subtext = document.getElementById('modal-subtext');

    btn.style.display = 'none';
    subtext.innerText = "Processing your AI Look...";

    setTimeout(() => {
        subtext.innerText = "You look amazing, Chief!";
        resultArea.innerHTML = `
            <div class="showroom-bg">
                <img src="images/senator_red.jpg" class="shaking-cloth">
            </div>
        `;
    }, 2000);
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
};

// 5. MIC/VOICE
const micBtn = document.getElementById('mic-btn');
if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    micBtn.onclick = () => {
        document.getElementById('voice-overlay').style.display = 'flex';
        recognition.start();
    };
    recognition.onresult = (e) => {
        document.getElementById('ai-input').value = e.results[0][0].transcript;
        document.getElementById('voice-overlay').style.display = 'none';
        executeSearch();
    };
}