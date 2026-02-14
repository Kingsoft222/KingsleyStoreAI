/**
 * Kingsley Store AI - Core Logic v3.5
 * FIXED: Forensic Identity Lock & Absolute Pathing
 */

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
let currentMode = 'photo';

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    const micBtn = document.getElementById('mic-btn');
    const aiInput = document.getElementById('ai-input');

    if (saved && ownerImg) { ownerImg.src = saved; userPhoto = saved; }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2000);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        micBtn.addEventListener('click', () => {
            try {
                recognition.start();
                micBtn.style.color = "#e60023"; 
                micBtn.classList.add('recording-pulse');
            } catch (e) { recognition.stop(); }
        });

        recognition.onresult = (event) => {
            aiInput.value = event.results[0][0].transcript;
            stopRecordingUI();
            executeSearch(); 
        };

        recognition.onerror = () => stopRecordingUI();
        recognition.onend = () => stopRecordingUI();

        function stopRecordingUI() {
            micBtn.style.color = "#5f6368"; 
            micBtn.classList.remove('recording-pulse');
        }
    }
});

window.handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { 
        document.getElementById('owner-img').src = reader.result; 
        document.getElementById('save-btn').style.display = 'inline-block';
        userPhoto = reader.result;
    };
    reader.readAsDataURL(file);
};

window.saveProfileData = () => {
    if (userPhoto) { localStorage.setItem('kingsley_profile_locked', userPhoto); alert("Profile locked!"); }
};

window.clearProfileData = () => {
    if (confirm("Remove profile photo?")) {
        localStorage.removeItem('kingsley_profile_locked');
        userPhoto = "";
        document.getElementById('owner-img').src = "images/kingsley.jpg";
    }
};

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';
    }
};

window.quickSearch = (query) => { document.getElementById('ai-input').value = query; executeSearch(); };

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    if (modal) modal.style.display = 'flex';
    document.getElementById('modal-subtext').innerText = "Select how you want to see the " + selectedCloth.name;

    resultArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; margin-top:10px;">
            <button onclick="initiateUploadFlow('photo')" style="width:240px; background:var(--accent); color:white; padding:15px; border-radius:10px; border:none; font-weight:bold;">📸 Photo Try-On</button>
            <button onclick="initiateUploadFlow('video')" style="width:240px; background:#333; color:white; padding:15px; border-radius:10px; border:1px solid var(--accent); font-weight:bold;">🎥 Video Walk</button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    document.getElementById('ai-fitting-result').innerHTML = ""; 
    const btn = document.getElementById('fit-action-btn');
    btn.style.display = 'block';
    btn.innerText = "Upload Photo";
    btn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Rock your cloth"; 
        btn.onclick = (currentMode === 'photo') ? startVertexModeling : startModeling;
    };
    reader.readAsDataURL(file);
};

// STRATEGY 1: Forensic Identity Photo
async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    const cartBtn = document.getElementById('add-to-cart-btn');
    const motionBtn = document.getElementById('see-it-motion-btn');
    area.innerHTML = `<p style="text-align:center;">Locking identity pixels...</p>`;
    
    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1] })
        });
        const data = await response.json();
        if (data.result) {
            area.innerHTML = `<img src="data:image/png;base64,${data.result}" id="final-swapped-img" style="width:100%; border-radius:15px; border: 4px solid var(--accent);">`;
            document.getElementById('fit-action-btn').style.display = 'none';
            if (cartBtn) cartBtn.style.display = 'block';
            if (motionBtn) motionBtn.style.display = 'block';
        }
    } catch (e) { area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
}

// STRATEGY 2: Luxury Walk Cycle
window.generateWalkCycle = async () => {
    const motionBtn = document.getElementById('see-it-motion-btn');
    const videoModal = document.getElementById('video-experience-modal');
    const videoPlayer = document.getElementById('boutique-video-player');
    const swappedImg = document.getElementById('final-swapped-img');
    motionBtn.innerHTML = 'Sewing your walk...';

    try {
        const response = await fetch('/.netlify/functions/generate-video', {
            method: 'POST',
            body: JSON.stringify({ swappedImage: swappedImg.src.split(',')[1] })
        });
        const data = await response.json();
        if (data.videoUrl) {
            videoPlayer.src = data.videoUrl;
            videoModal.style.display = 'block';
            videoPlayer.play();
        }
    } catch (e) { alert("Try again shortly!"); }
    motionBtn.innerHTML = 'See How I Look (Walk) 🎬';
};

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('add-to-cart-btn').style.display = 'none';
    document.getElementById('see-it-motion-btn').style.display = 'none';
};