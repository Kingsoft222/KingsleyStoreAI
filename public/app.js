/**
 * KingsleyStoreAI - ABSOLUTE FINAL BUILD
 * TARGET: PROD-READY UI & LOGIC
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Nne, what are you looking for today?", "My guy, what are you looking for today?", 
    "Boss, what are you looking for today?", "Chief, looking for premium native?"
];

let gIndex = 0;
let userPhoto = ""; 
let selectedCloth = null; 
let currentMode = 'photo';

// --- 1. BOOTSTRAP ---
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            gIndex = (gIndex + 1) % greetings.length;
            el.innerText = greetings[gIndex];
        }
    }, 1200);
});

// --- 2. THE PROFILE ENGINE (AGGRESSIVE REMOVE) ---
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

// HARD RESET: Directly clears the attribute and the memory
window.removeProfilePhoto = () => {
    if (confirm("Permanently remove your profile photo?")) {
        // Clear memory
        localStorage.removeItem('kingsley_profile_locked');
        userPhoto = "";
        
        // Force UI Reset
        const imgElement = document.getElementById('owner-img');
        if (imgElement) {
            imgElement.removeAttribute('src'); // Completely strip the image
            imgElement.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // Set to transparent
        }
        
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.style.display = 'none';
    }
};

// --- 3. SEARCH & DUAL SHOWROOM (CLEAN UI) ---
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

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const resultArea = document.getElementById('ai-fitting-result');
    const modal = document.getElementById('fitting-room-modal');
    if (modal) modal.style.display = 'flex';
    
    // UI: Choice Menu Only (No extra upload buttons)
    resultArea.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <h2 style="color:#d90429; margin-bottom:10px;">AI Showroom</h2>
            <p style="color:white; margin-bottom:25px;">Select how you want to see the ${selectedCloth.name}</p>
            <div style="display:flex; flex-direction:column; gap:15px; align-items:center;">
                <button onclick="goToUpload('photo')" style="width:280px; background:#ffd700; color:black; padding:18px; border-radius:12px; border:none; cursor:pointer; font-weight:bold; font-size:16px;">
                    📸 See How You Look (Photo)
                </button>
                <button onclick="goToUpload('video')" style="width:280px; background:#333; color:white; padding:18px; border-radius:12px; border:1px solid #ffd700; cursor:pointer; font-weight:bold; font-size:16px;">
                    🎥 See How You Look (Video)
                </button>
            </div>
        </div>
    `;
};

// --- 4. THE VIRTUAL TRY-ON ENGINE ---
window.goToUpload = (mode) => {
    currentMode = mode;
    const resultArea = document.getElementById('ai-fitting-result');
    
    resultArea.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <p id="modal-subtext" style="color:white; margin-bottom:20px;">Upload your full photo for the ${mode} result</p>
            <input type="file" id="user-fit-input" accept="image/*" onchange="handleModelingUpload(event)" style="display:none;">
            <button id="fit-action-btn" onclick="document.getElementById('user-fit-input').click()" style="background:#ffd700; color:black; padding:15px 30px; border-radius:10px; border:none; font-weight:bold; cursor:pointer;">
                Upload Photo
            </button>
        </div>
    `;
};

window.handleModelingUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        const subtext = document.getElementById('modal-subtext');
        
        if (btn) {
            btn.innerText = "Rock your cloth"; 
            subtext.innerText = "Ready! Tap to generate the " + currentMode + " result.";
            btn.onclick = (currentMode === 'photo') ? startVertexModeling : startModeling;
        }
    };
    reader.readAsDataURL(file);
};

// --- 5. EXECUTION ---
async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<p style="color:white; text-align:center;">Processing photo...</p>`;
    try {
        const response = await fetch('/.netlify/functions/process-vertex', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img })
        });
        const data = await response.json();
        area.innerHTML = `<img src="${data.outputImage}" style="width:100%; border-radius:15px; border: 4px solid #ffd700;">`;
    } catch (e) { area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
}

async function startModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<p style="color:white; text-align:center;">Sewing video...</p>`;
    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img })
        });
        const data = await response.json();
        let checkInterval = setInterval(async () => {
            const check = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`);
            const result = await check.json();
            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                let url = Array.isArray(result.output) ? result.output[0] : result.output;
                area.innerHTML = `<video autoplay loop muted playsinline style="width:100%; border-radius:15px;"><source src="${url}" type="video/mp4"></video>`;
            }
        }, 5000);
    } catch (e) { area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
};