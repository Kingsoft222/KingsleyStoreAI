/**
 * Kingsley Store AI - Core Logic v4.9
 * UI PRESERVED: Spinner and "Kingsley Runway" branding untouched.
 * FIX: Polling logic added to prevent indefinite loading.
 * ADDITION: "Add to Cart" button placed below the video.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?", "My guy, what are you looking for today?",
    "Classic Babe, what are you looking for today?", "Boss, what are you looking for today?",
    "Classic Man, what are you looking for today?", "Chief, looking for premium native?",
    "Baddie, let's find your style!"
];

let gIndex = 0;
let userPhoto = "";
let selectedCloth = null;
let currentMode = 'photo';

// --- 1. BOOTSTRAP (PRESERVED) ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    const micBtn = document.getElementById('mic-btn');
    const aiInput = document.getElementById('ai-input');

    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            el.innerText = greetings[gIndex % greetings.length];
            gIndex++;
        }
    }, 2000);

    // --- MIC FUNCTIONALITY (PRESERVED) ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        micBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                recognition.start();
                micBtn.style.color = "#e60023"; 
                micBtn.classList.add('recording-pulse');
                aiInput.placeholder = "Listening...";
            } catch (err) { recognition.stop(); }
        });

        recognition.onresult = (event) => {
            aiInput.value = event.results[0][0].transcript;
            micBtn.style.color = "#5f6368";
            micBtn.classList.remove('recording-pulse');
            window.executeSearch(); 
        };
    }
});

// --- 2. SEARCH & SHOWROOM (PRESERVED) ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim()) return;

    const matched = clothesCatalog.filter(item =>
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="cursor:pointer;">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:var(--accent); font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    if (modal) { modal.style.display = 'flex'; }
    document.getElementById('modal-subtext').innerText = "Select how you want to see the " + selectedCloth.name;
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn">📸 See How You Look (Photo)</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn">🎥 See How You Look (Video)</button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    document.getElementById('modal-subtext').innerText = "Upload your photo for " + mode + " result";
    const fitBtn = document.getElementById('fit-action-btn');
    fitBtn.style.display = 'block';
    fitBtn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Rock your cloth";
        btn.onclick = (currentMode === 'photo') ? startVertexModeling : generateWalkCycle;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 3. VIDEO ENGINE (FIXED POLLING) ---
window.generateWalkCycle = async () => {
    const videoModal = document.getElementById('video-experience-modal');
    const wrapper = document.querySelector('.video-wrapper');
    const bottomSection = document.getElementById('video-bottom-section');
    
    videoModal.style.display = 'block';
    // KEEPING THE UI EXACTLY AS PER YOUR IMAGE
    wrapper.innerHTML = `
        <div id="loader-placeholder" style="background: black; padding: 40px; border-radius: 20px; text-align: center; color: white;">
            <div class="spinner-box" style="margin-bottom: 10px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
            <p style="font-weight: bold; margin: 0;">Sewing Runway Walk...</p>
            <p style="font-size: 0.8rem; margin: 0; opacity: 0.8;">This may take up to 30 seconds</p>
        </div>
        <video id="boutique-video-player" autoplay loop muted playsinline style="display:none; width:100%; border-radius:30px;"></video>
    `;

    try {
        const response = await fetch('/.netlify/functions/generate-video-background', {
            method: 'POST',
            body: JSON.stringify({ swappedImage: userPhoto.split(',')[1], clothName: selectedCloth.name })
        });

        // POLLING: Check every 4 seconds so the UI doesn't hang
        let checkInterval = setInterval(async () => {
            const statusRes = await fetch(`/.netlify/functions/check-video-status?cloth=${selectedCloth.name}`);
            const statusData = await statusRes.json();
            
            if (statusData.videoUrl) {
                clearInterval(checkInterval);
                document.getElementById('loader-placeholder').style.display = 'none';
                const player = document.getElementById('boutique-video-player');
                player.src = statusData.videoUrl;
                player.style.display = 'block';
                
                // Show Add to Cart Button below video
                bottomSection.insertAdjacentHTML('beforeend', `
                    <button class="primary-btn" style="background:#28a745; margin-top:10px; width:100%;" onclick="addToCart()">Add to Cart 🛒</button>
                `);
            }
        }, 4000);

    } catch (e) { console.error("Video Failed"); }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };