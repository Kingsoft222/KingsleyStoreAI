/**
 * Kingsley Store AI - Core Logic v4.8
 * FULL RECOVERY PRESERVED: Mic, Search, and Clicks are UNTOUCHED.
 * SPEED FIX: Implemented Polling for Background Video.
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

// --- 1. BOOTSTRAP (UNTOUCHED) ---
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
            } catch (err) {
                recognition.stop();
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            aiInput.value = transcript;
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

// --- 2. SEARCH & SHOWROOM (UNTOUCHED) ---
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
                <h4 style="pointer-events:none;">${item.name}</h4>
                <p style="color:var(--accent); font-weight:bold; pointer-events:none;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        results.innerHTML = `<p style="padding:20px; text-align:center;">No results for "${input}".</p>`;
    }
};

window.quickSearch = (query) => {
    document.getElementById('ai-input').value = query;
    window.executeSearch();
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    if (modal) { modal.style.display = 'flex'; modal.style.zIndex = '9999'; }
    document.getElementById('fit-action-btn').style.display = 'none';
    document.getElementById('modal-subtext').innerText = "Select how you want to see the " + selectedCloth.name;
    resultArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; margin-top:10px; width:100%;">
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
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Rock your cloth";
        btn.onclick = (currentMode === 'photo') ? startVertexModeling : generateWalkCycle;
    };
    reader.readAsDataURL(file);
};

// --- 3. ENGINES (POLLING UPDATE FOR SPEED) ---
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
            document.getElementById('see-it-motion-btn').style.display = 'block';
        }
    } catch (e) { area.innerHTML = `<p style="color:red;">Timeout. Please try again.</p>`; }
}

window.generateWalkCycle = async () => {
    const videoModal = document.getElementById('video-experience-modal');
    const wrapper = document.querySelector('.video-wrapper');
    videoModal.style.display = 'block';
    wrapper.innerHTML = `<div style="text-align:center; color:white; padding:50px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Sewing Runway Walk...<br><small>This may take up to 30 seconds</small></p></div>`;

    try {
        const swappedImg = document.getElementById('final-swapped-img');
        const imgData = swappedImg ? swappedImg.src.split(',')[1] : userPhoto.split(',')[1];
        
        // Trigger the Background Function
        const response = await fetch('/.netlify/functions/generate-video-background', {
            method: 'POST',
            body: JSON.stringify({ swappedImage: imgData, clothName: selectedCloth.name })
        });

        // POLLING: Check every 5 seconds for the result URL
        let checkInterval = setInterval(async () => {
            const statusRes = await fetch(`/.netlify/functions/check-video-status?cloth=${selectedCloth.name}`);
            const statusData = await statusRes.json();
            
            if (statusData.videoUrl) {
                clearInterval(checkInterval);
                wrapper.innerHTML = `<video autoplay loop muted playsinline style="width:100%; border-radius:30px;"><source src="${statusData.videoUrl}" type="video/mp4"></video>`;
            }
        }, 5000);

    } catch (e) { console.error("Video Trigger Failed"); }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };