const greetings = [
    "Nne, what are you looking for today?",
    "My guy, what are you looking for today?",
    "Classic babe, what are you looking for today?",
    "Chief, let's find that perfect native...",
    "Baddie, which pattern is yours?",
    "Oga, look sharp for that meeting!"
];

let greetingIdx = 0;

// --- ROTATING HYPE TEXT (Every 3 Mins) ---
function cycleGreeting() {
    const el = document.getElementById('dynamic-greeting');
    if(!el) return;
    el.style.opacity = 0;
    setTimeout(() => {
        greetingIdx = (greetingIdx + 1) % greetings.length;
        el.innerText = greetings[greetingIdx];
        el.style.opacity = 1;
    }, 500);
}
setInterval(cycleGreeting, 180000); 

// --- PROFILE PHOTO PERSISTENCE ---
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('user_profile_data');
    if (saved) {
        document.getElementById('owner-img').src = saved;
    }
});

window.previewStoreOwnerPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('owner-img').src = ev.target.result;
            document.getElementById('save-profile-btn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
};

window.saveProfilePhoto = () => {
    const dataUrl = document.getElementById('owner-img').src;
    localStorage.setItem('user_profile_data', dataUrl); // LOCKED SAVING
    document.getElementById('save-profile-btn').style.display = 'none';
    alert("Profile Saved!");
};

window.removeProfilePhoto = () => {
    localStorage.removeItem('user_profile_data');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
};

// --- STORE ENTRANCE ANIMATION TRIGGER ---
// Inside your triggerAction() success logic:
function displayResult(base64Image) {
    const container = document.getElementById('ai-output-container');
    container.innerHTML = `
        <div class="generated-container">
            <img src="data:image/png;base64,${base64Image}" class="store-result-img">
            <p style="text-align:center; font-size:0.8rem; color:#666;">You look great in the showroom!</p>
        </div>
    `;
}