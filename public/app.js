// CLOTHES DATABASE (To make search retrieval work)
const clothes = [
    { id: 1, name: "Premium Red Senator", keywords: "senator red native", img: "senator_red.jpg", price: "₦25,000" },
    { id: 2, name: "Royal Blue Ankara", keywords: "ankara blue native", img: "ankara_blue.jpg", price: "₦22,000" },
    { id: 3, name: "Black Dinner Suit", keywords: "dinner outfit black", img: "dinner_black.jpg", price: "₦45,000" },
    { id: 4, name: "Slim Fit Trousers", keywords: "trousers black formal", img: "trousers_black.jpg", price: "₦15,000" }
];

const greetings = [
    "Nne, what are you looking for today?",
    "My guy, what are you looking for today?",
    "Classic babe, what are you looking for today?",
    "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;

// 1. HYPE ROTATION
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (!el) return;
    el.style.opacity = 0;
    setTimeout(() => {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
        el.style.opacity = 1;
    }, 500);
}, 180000);

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

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
    document.getElementById('save-btn').style.display = 'none';
};

// 3. SEARCH RETRIEVAL LOGIC (Senator/Ankara Fix)
window.executeSearch = () => {
    const query = document.getElementById('ai-input').value.toLowerCase();
    const resultsArea = document.getElementById('ai-results');
    
    const filtered = clothes.filter(item => 
        item.name.toLowerCase().includes(query) || item.keywords.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        resultsArea.innerHTML = filtered.map(item => `
            <div class="result-card">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        resultsArea.style.display = 'grid';
    } else {
        resultsArea.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>No outfits found. Try 'Senator' or 'Ankara'.</p>";
        resultsArea.style.display = 'grid';
    }
};

window.quickSearch = (term) => {
    document.getElementById('ai-input').value = term;
    executeSearch();
};

// 4. WHATSAPP STYLE VOICE POPUP
const micBtn = document.getElementById('mic-btn');
const voiceOverlay = document.getElementById('voice-overlay');

if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-NG';

    micBtn.onclick = () => {
        voiceOverlay.style.display = 'flex';
        recognition.start();
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('ai-input').value = transcript;
        voiceOverlay.style.display = 'none';
        executeSearch();
    };

    recognition.onend = () => { voiceOverlay.style.display = 'none'; };
}

window.cancelVoice = () => {
    voiceOverlay.style.display = 'none';
};