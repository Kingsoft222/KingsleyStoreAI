/**
 * Kingsley Store AI - Core Logic v4.5
 * FIXED: Infinite Loading/Timeout Issues.
 * PRESERVED: Original Buttons, Greetings, and UI.
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
    if (saved) {
        userPhoto = saved;
        const ownerImg = document.getElementById('owner-img');
        if (ownerImg) ownerImg.src = saved;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            el.innerText = greetings[gIndex % greetings.length];
            gIndex++;
        }
    }, 2000);
});

// --- 2. SEARCH & CLICK (FIXED) ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
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

// --- 3. THE ENGINES (STABILITY UPGRADE) ---

async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<div style="text-align:center; padding:20px;">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p style="color:#555; margin-top:10px;">Applying your ${selectedCloth.name}...</p>
                        <p style="font-size:0.8rem; color:#888;">Locking forensic identity pixels...</p>
                      </div>`;
    
    try {
        // We add a timeout controller to prevent the app from hanging forever
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s limit

        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            signal: controller.signal,
            body: JSON.stringify({ userImage: userPhoto.split(',')[1] })
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (data.result) {
            area.innerHTML = `<img src="data:image/png;base64,${data.result}" id="final-swapped-img" style="width:100%; border-radius:15px; border: 4px solid var(--accent);">`;
            document.getElementById('fit-action-btn').style.display = 'none';
            document.getElementById('add-to-cart-btn').style.display = 'block';
            document.getElementById('see-it-motion-btn').style.display = 'block';
        }
    } catch (e) {
        area.innerHTML = `<p style="color:red;">The runway is busy (Network Timeout). Please tap "Rock your cloth" again.</p>`;
    }
}

window.generateWalkCycle = async () => {
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'block';
    const wrapper = document.querySelector('.video-wrapper');
    wrapper.innerHTML = `<div style="padding:40px; text-align:center; color:white;">
                            <i class="fas fa-magic fa-spin fa-2x"></i>
                            <p style="margin-top:15px;">Sewing your Runway Walk...</p>
                         </div>`;

    try {
        const swappedImg = document.getElementById('final-swapped-img');
        const imgData = swappedImg ? swappedImg.src.split(',')[1] : userPhoto.split(',')[1];
        
        const response = await fetch('/.netlify/functions/generate-video', {
            method: 'POST',
            body: JSON.stringify({ swappedImage: imgData, clothName: selectedCloth.name })
        });
        const data = await response.json();
        
        if (data.videoUrl) {
            wrapper.innerHTML = `<video id="boutique-video-player" autoplay loop muted playsinline style="width:100%; border-radius:30px;">
                                    <source src="${data.videoUrl}" type="video/mp4">
                                 </video>`;
        }
    } catch (e) { videoModal.style.display = 'none'; }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };