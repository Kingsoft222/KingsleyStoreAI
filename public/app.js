const greetings = [
    "Nne, what are you looking for today?",
    "My guy, what are you looking for today?",
    "Classic babe, what are you looking for today?",
    "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;

// 3-Minute Hype Rotation
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

// PERSISTENCE FIX: Runs on load
window.onload = () => {
    const savedImg = localStorage.getItem('kingsley_profile_locked');
    if (savedImg) document.getElementById('owner-img').src = savedImg;
};

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => { document.getElementById('owner-img').src = reader.result; };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveProfileData = () => {
    const currentSrc = document.getElementById('owner-img').src;
    localStorage.setItem('kingsley_profile_locked', currentSrc);
    alert("Profile Saved Permanently!");
};

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
};

window.quickSearch = (term) => {
    document.getElementById('ai-input').value = term;
};

window.executeSearch = () => {
    const val = document.getElementById('ai-input').value;
    alert("Searching for: " + val);
    // Add your AI search logic here
};