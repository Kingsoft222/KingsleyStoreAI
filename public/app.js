/**
 * Kingsley Store AI - Core Logic v5.3
 * FULL AUTHORIZED VERSION: Mic, Greetings, Search, and Gemini Engine.
 * SEQUENCE LOCKED: Search Tap -> Choice -> Upload -> Result.
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

    // --- MIC FUNCTIONALITY (LOCKED) ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';

        micBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                recognition.start();
                micBtn.style.color = "#e60023"; 
                micBtn.classList.add('recording-pulse');
                aiInput.placeholder = "Listening...";
            } catch (err) {
                recognition.stop();
            }
        });

        recognition.onresult = (event) => {
            aiInput.value = event.results[0][0].transcript;
            micBtn.style.color = "#5f6368"; 
            micBtn.classList.remove('recording-pulse');
            window.executeSearch(); 
        };
    }
});

// --- 2. SEARCH & SEQUENCE (LOCKED) ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim()) return;

    const matched = clothesCatalog.filter(item =>
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.style.zIndex = '1000';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="cursor:pointer; position:relative; z-index:1001;">
                <img src="images/${item.img}" alt="${item.name}" style="pointer-events:none;">
                <h4>${item.name}</h4>
                <p style="color:var(--accent); font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    if (modal) { modal.style.display = 'flex'; modal.style.zIndex = '9999'; }
    
    document.getElementById('modal-subtext').innerText = "Select how you want to see the " + selectedCloth.name;
    document.getElementById('fit-action-btn').style.display = 'none';

    resultArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; margin-top:10px;">
            <button onclick="window.initiateUploadFlow('photo')" style="width:240px; background:var(--accent); color:white; padding:15px; border-radius:10px; border:none; cursor:pointer; font-weight:bold;">
                📸 See How You Look (Photo)
            </button>
            <button onclick="window.initiateUploadFlow('video')" style="width:240px; background:#333; color:white; padding:15px; border-radius:10px; border:1px solid var(--accent); cursor:pointer; font-weight:bold;">
                🎥 See How You Look (Video)
            </button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    document.getElementById('modal-subtext').innerText = "Upload your photo for " + mode + " result";
    document.getElementById('ai-fitting-result').innerHTML = "";
    const fitBtn = document.getElementById('fit-action-btn');
    fitBtn.style.display = 'block';
    fitBtn.innerText = "Upload Photo";
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

// --- 3. ENGINES ---
async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<p style="text-align:center;">Applying your ${selectedCloth.name}...</p>`;
    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1] })
        });
        const data = await response.json();
        if (data.result) {
            area.innerHTML = `<img src="data:image/png;base64,${data.result}" id="final-swapped-img" style="width:100%; border-radius:15px; border: 4px solid var(--accent);">`;
            document.getElementById('fit-action-btn').style.display = 'none';
        }
    } catch (e) { area.innerHTML = `<p style="color:red;">Timeout. Please try again.</p>`; }
}

window.generateWalkCycle = async () => {
    const videoModal = document.getElementById('video-experience-modal');
    const wrapper = document.querySelector('.video-wrapper');
    const bottomSection = document.getElementById('video-bottom-section');
    videoModal.style.display = 'block';
    
    // PRESERVED UI FROM YOUR IMAGE
    wrapper.innerHTML = `
        <div id="loader-placeholder" style="background: black; padding: 40px; border-radius: 20px; text-align: center; color: white;">
            <div class="spinner-box" style="margin-bottom: 10px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
            <p style="font-weight: bold; margin: 0;">Sewing Runway Walk...</p>
            <p style="font-size: 0.8rem; margin: 0; opacity: 0.8;">Improved Experience via Gemini 3 Flash</p>
        </div>
        <video id="boutique-video-player" autoplay loop muted playsinline style="display:none; width:100%; border-radius:30px;"></video>
    `;

    try {
        const imgData = userPhoto.split(',')[1];
        await fetch('/.netlify/functions/generate-video-background', {
            method: 'POST',
            body: JSON.stringify({ swappedImage: imgData, clothName: selectedCloth.name })
        });

        // Polling handshake
        let attempts = 0;
        let checkInterval = setInterval(async () => {
            attempts++;
            const statusRes = await fetch(`/.netlify/functions/check-video-status?cloth=${selectedCloth.name}`);
            const statusData = await statusRes.json();
            
            if (statusData.videoUrl) {
                clearInterval(checkInterval);
                document.getElementById('loader-placeholder').style.display = 'none';
                const player = document.getElementById('boutique-video-player');
                player.src = statusData.videoUrl;
                player.style.display = 'block';
                
                if (!document.getElementById('vto-add-to-cart')) {
                    bottomSection.insertAdjacentHTML('beforeend', `
                        <button id="vto-add-to-cart" class="primary-btn" style="background:#28a745; margin-top:20px; width:100%;" onclick="addToCart()">Add to Cart 🛒</button>
                    `);
                }
            }
            if (attempts > 15) { clearInterval(checkInterval); }
        }, 4000);
    } catch (e) { console.error("Video Failed"); }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };