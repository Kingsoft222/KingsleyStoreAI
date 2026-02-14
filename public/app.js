/**
 * Kingsley Store AI - Core Logic v3.7
 * FIXED: Search Result Clickability & Modal Pop-up
 * UPDATED: Doppl-Style "Fast" Immersive Walk
 * PRESERVED: Forensic Identity & Mic Logic
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

// --- 1. BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    const micBtn = document.getElementById('mic-btn');
    const aiInput = document.getElementById('ai-input');

    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    // Greeting Rotation
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            el.innerText = greetings[gIndex % greetings.length];
            gIndex++;
        }
    }, 2000);

    // Mic Recognition Logic
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
                aiInput.placeholder = "Listening...";
            } catch (e) { recognition.stop(); }
        });

        recognition.onresult = (event) => {
            aiInput.value = event.results[0][0].transcript;
            stopRecordingUI();
            window.executeSearch(); 
        };

        recognition.onerror = () => stopRecordingUI();
        recognition.onend = () => stopRecordingUI();

        function stopRecordingUI() {
            micBtn.style.color = "#5f6368"; 
            micBtn.classList.remove('recording-pulse');
            aiInput.placeholder = "Search Senator or Ankara...";
        }
    }
});

// --- 2. PROFILE ACTIONS ---
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
    if (userPhoto) {
        localStorage.setItem('kingsley_profile_locked', userPhoto);
        document.getElementById('save-btn').style.display = 'none';
        alert("Profile locked!");
    }
};

// --- 3. SEARCH & SHOWROOM (FIXED CLICK LOGIC) ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    
    // Filter Catalog
    const matched = clothesCatalog.filter(item =>
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid'; // Ensure it's visible
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="cursor:pointer;">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:var(--accent); font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        results.innerHTML = `<p style="padding:20px; text-align:center;">Keep looking, Boss. No results for "${input}".</p>`;
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    
    if (modal) modal.style.display = 'flex';
    
    document.getElementById('fit-action-btn').style.display = 'none';
    document.getElementById('modal-subtext').innerText = "Select view for " + selectedCloth.name;

    resultArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; margin-top:10px;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn" style="background:var(--accent);">📸 Photo Try-On</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn">🎥 Video Walk</button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    document.getElementById('modal-subtext').innerText = "Upload photo for " + mode;
    document.getElementById('ai-fitting-result').innerHTML = "";
    const fitBtn = document.getElementById('fit-action-btn');
    fitBtn.style.display = 'block';
    fitBtn.innerText = "Upload Photo";
    fitBtn.onclick = () => document.getElementById('user-fit-input').click();
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

// --- 4. THE ENGINES ---

// STRATEGY 1: PHOTO (Forensic)
async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<div class="shimmer-overlay"><p>Applying Native Wear...</p></div>`;
    
    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1] })
        });
        const data = await response.json();
        if (data.result) {
            const finalImg = `data:image/png;base64,${data.result}`;
            area.innerHTML = `<img src="${finalImg}" id="final-swapped-img" style="width:100%; border-radius:15px; border: 4px solid var(--accent);">`;
            document.getElementById('fit-action-btn').style.display = 'none';
            document.getElementById('add-to-cart-btn').style.display = 'block';
            document.getElementById('see-it-motion-btn').style.display = 'block';
        }
    } catch (e) { area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
}

// STRATEGY 2: DOPPL IMMERSIVE WALK (The Fast One)
window.generateWalkCycle = async () => {
    const videoModal = document.getElementById('video-experience-modal');
    const swappedImg = document.getElementById('final-swapped-img');

    // 1. INSTANT UI REVEAL
    videoModal.style.display = 'block';
    const wrapper = document.querySelector('.video-wrapper');
    wrapper.innerHTML = `
        <div id="loader-placeholder" class="shimmer-overlay" style="height:100%; position:absolute; width:100%; z-index:100;">
            <i class="fas fa-magic fa-spin fa-2x"></i>
            <p style="margin-top:15px; font-weight:bold;">Sewing your Runway Walk...</p>
        </div>
        <video id="boutique-video-player" class="doppl-video" autoplay loop muted playsinline style="display:none;"></video>
    `;

    try {
        const response = await fetch('/.netlify/functions/generate-video', {
            method: 'POST',
            body: JSON.stringify({ 
                swappedImage: swappedImg.src.split(',')[1],
                clothName: selectedCloth.name
            })
        });
        const data = await response.json();

        if (data.videoUrl) {
            const player = document.getElementById('boutique-video-player');
            const loader = document.getElementById('loader-placeholder');
            
            player.src = data.videoUrl;
            player.style.display = 'block';
            player.onloadeddata = () => {
                loader.style.display = 'none';
                player.play();
            };
        }
    } catch (e) {
        alert("Runway busy! Please try again.");
        videoModal.style.display = 'none';
    }
};

window.closeVideoModal = () => {
    const videoModal = document.getElementById('video-experience-modal');
    const videoPlayer = document.getElementById('boutique-video-player');
    if(videoPlayer) videoPlayer.pause();
    videoModal.style.display = 'none';
};

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('add-to-cart-btn').style.display = 'none';
    document.getElementById('see-it-motion-btn').style.display = 'none';
    document.getElementById('fit-action-btn').style.display = 'block';
};