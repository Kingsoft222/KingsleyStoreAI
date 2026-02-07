const greetings = [
    "Nne, what are you looking for today?",
    "My guy, what are you looking for today?",
    "Classic babe, what are you looking for today?",
    "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;

// 1. HYPE MESSAGE ROTATION (3 Minutes)
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

// 2. PROFILE & SMART SAVE BUTTON
window.onload = () => {
    const savedImg = localStorage.getItem('kingsley_profile_locked');
    if (savedImg) document.getElementById('owner-img').src = savedImg;
};

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => { 
        document.getElementById('owner-img').src = reader.result; 
        // Show save button ONLY when a new photo is picked
        document.getElementById('save-btn').style.display = 'inline-block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveProfileData = () => {
    const currentSrc = document.getElementById('owner-img').src;
    localStorage.setItem('kingsley_profile_locked', currentSrc);
    // Disappear immediately after saving
    document.getElementById('save-btn').style.display = 'none';
    alert("Profile Saved!");
};

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
    document.getElementById('save-btn').style.display = 'none';
};

// 3. KEYWORD & SEARCH LOGIC
window.quickSearch = (term) => {
    document.getElementById('ai-input').value = term;
    executeSearch(); // Trigger search when card is tapped
};

window.executeSearch = () => {
    const val = document.getElementById('ai-input').value;
    if(!val) return;
    // Your actual search/filter logic goes here
    console.log("Searching for:", val);
    document.getElementById('ai-results').style.display = 'grid';
};

// 4. MIC/VOICE LOGIC RESTORED
const micBtn = document.getElementById('mic-btn');
if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.onclick = () => {
        recognition.start();
        micBtn.style.color = "red";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('ai-input').value = transcript;
        micBtn.style.color = "black";
        executeSearch();
    };

    recognition.onerror = () => {
        micBtn.style.color = "black";
    };
}