/**
 * Kingsley Store AI - Core Logic v5.4
 * FULL ALIGNMENT: HTML and JS synchronized.
 * PERFORMANCE: Gemini 3 Flash polling logic.
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

// --- BOOTSTRAP ---
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
        recognition.lang = 'en-US';

        micBtn.onclick = () => {
            try {
                recognition.start();
                micBtn.style.color = "#e60023";
                aiInput.placeholder = "Listening...";
            } catch (err) { recognition.stop(); }
        };

        recognition.onresult = (event) => {
            aiInput.value = event.results[0][0].transcript;
            micBtn.style.color = "#5f6368";
            window.executeSearch();
        };
    }
});

// --- UI HELPERS ---
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };

// --- LOGIC ---
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
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:var(--accent); font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('modal-subtext').innerText = "Select view for " + selectedCloth.name;
    document.getElementById('fit-action-btn').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; margin-top:10px;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn" style="background:var(--accent);">📸 See How You Look (Photo)</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn" style="background:#333;">🎥 See How You Look (Video)</button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    document.getElementById('modal-subtext').innerText = "Upload photo for " + mode;
    document.getElementById('ai-fitting-result').innerHTML = "";
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

async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<p>Applying your ${selectedCloth.name}...</p>`;
    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1] })
        });
        const data = await response.json();
        if (data.result) {
            area.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:15px;">`;
            document.getElementById('see-it-motion-btn').style.display = 'block';
        }
    } catch (e) { area.innerHTML = `<p style="color:red;">Error. Please try again.</p>`; }
}

window.generateWalkCycle = async () => {
    const videoModal = document.getElementById('video-experience-modal');
    const wrapper = document.getElementById('video-main-container');
    const bottomSection = document.getElementById('video-bottom-section');
    
    videoModal.style.display = 'flex';
    wrapper.innerHTML = `
        <div id="loader-placeholder" style="background: black; padding: 40px; text-align: center; color: white;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="font-weight: bold; margin-top: 10px;">Sewing Runway Walk...</p>
        </div>
        <video id="boutique-video-player" autoplay loop muted playsinline style="display:none; width:100%;"></video>
    `;

    try {
        await fetch('/.netlify/functions/generate-video-background', {
            method: 'POST',
            body: JSON.stringify({ swappedImage: userPhoto.split(',')[1], clothName: selectedCloth.name })
        });

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
                        <button id="vto-add-to-cart" class="primary-btn" style="background:#28a745; margin-top:10px; width:100%;" onclick="addToCart()">Add to Cart 🛒</button>
                    `);
                }
            }
            if (attempts > 20) { 
                clearInterval(checkInterval);
                document.getElementById('loader-placeholder').innerHTML = "<p>Runway busy. Try again.</p>";
            }
        }, 5000);
    } catch (e) { console.error("Video Trigger Failed"); }
};