const hypeText = [
    "Nne, what are you looking for today?",
    "My guy, what are you looking for today?",
    "Classic babe, what are you looking for today?",
    "Chief, let's get you that premium look.",
    "Baddie, exclusive patterns just for you!"
];

let hypeIdx = 0;

// HYPE ROTATION (3 Minutes)
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    el.style.opacity = 0;
    setTimeout(() => {
        hypeIdx = (hypeIdx + 1) % hypeText.length;
        el.innerText = hypeText[hypeIdx];
        el.style.opacity = 1;
    }, 500);
}, 180000);

// PROFILE PERSISTENCE
window.onload = () => {
    const saved = localStorage.getItem('kingsley_profile');
    if (saved) document.getElementById('owner-img').src = saved;
};

window.updateProfile = (e) => {
    const reader = new FileReader();
    reader.onload = () => { document.getElementById('owner-img').src = reader.result; };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveProfile = () => {
    localStorage.setItem('kingsley_profile', document.getElementById('owner-img').src);
    alert("Profile Saved!");
};

window.resetProfile = () => {
    localStorage.removeItem('kingsley_profile');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
};