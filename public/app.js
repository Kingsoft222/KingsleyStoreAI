/**
 * Kingsley Store AI - Core Logic
 * Matches index.html perfectly.
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

// --- 1. BOOTSTRAP & MEMORY ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    // Greeting cycle
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            el.innerText = greetings[gIndex % greetings.length];
            gIndex++;
        }
    }, 2000);
});

// --- 2. PROFILE ACTIONS (FIXED REMOVE) ---
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

// This matches your HTML onclick="clearProfileData()"
window.clearProfileData = () => {
    if (confirm("Remove profile photo?")) {
        localStorage.removeItem('kingsley_profile_locked');
        userPhoto = "";
        const img = document.getElementById('owner-img');
        if (img) {
            img.src = "images/kingsley.jpg"; // Reset to your default image
        }
        document.getElementById('save-btn').style.display = 'none';
    }
};

// --- 3. SEARCH & SHOWROOM Choice ---
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

window.quickSearch = (query) => {
    document.getElementById('ai-input').value = query;
    executeSearch();
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    const subtext = document.getElementById('modal-subtext');
    const uploadBtn = document.getElementById('fit-action-btn');

    if (modal) modal.style.display = 'flex';
    
    // Hide the default upload button initially to show choices
    uploadBtn.style.display = 'none';
    subtext.innerText = "Select how you want to see the " + selectedCloth.name;

    resultArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; margin-top:10px;">
            <button onclick="initiateUploadFlow('photo')" style="width:240px; background:var(--accent); color:white; padding:15px; border-radius:10px; border:none; cursor:pointer; font-weight:bold;">
                📸 See How You Look (Photo)
            </button>
            <button onclick="initiateUploadFlow('video')" style="width:240px; background:#333; color:white; padding:15px; border-radius:10px; border:1px solid var(--accent); cursor:pointer; font-weight:bold;">
                🎥 See How You Look (Video)
            </button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    currentMode = mode;
    const resultArea = document.getElementById('ai-fitting-result');
    const uploadBtn = document.getElementById('fit-action-btn');
    const subtext = document.getElementById('modal-subtext');

    subtext.innerText = "Upload your photo for " + mode + " result";
    resultArea.innerHTML = ""; // Clear choices
    uploadBtn.style.display = 'block'; // Show the actual upload button from HTML
    uploadBtn.innerText = "Upload Photo";
    
    // Reset click action in case it was changed
    uploadBtn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        if (btn) {
            btn.innerText = "Rock your cloth"; 
            btn.onclick = (currentMode === 'photo') ? startVertexModeling : startModeling;
        }
    };
    reader.readAsDataURL(file);
};

// --- 4. ENGINES ---
async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<p style="color:#555; text-align:center;">Processing photo result...</p>`;
    try {
        const response = await fetch('/.netlify/functions/process-vertex', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img })
        });
        const data = await response.json();
        area.innerHTML = `<img src="${data.outputImage}" style="width:100%; border-radius:15px; border: 4px solid var(--accent);">`;
        document.getElementById('fit-action-btn').style.display = 'none';
        document.getElementById('add-to-cart-btn').style.display = 'block';
    } catch (e) { area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
}

async function startModeling() {
    const area = document.getElementById('ai-fitting-result');
    area.innerHTML = `<p style="color:#555; text-align:center;">Sewing video result...</p>`;
    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img })
        });
        const data = await response.json();
        let check = setInterval(async () => {
            const res = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`).then(r => r.json());
            if (res.status === "succeeded") {
                clearInterval(check);
                let url = Array.isArray(res.output) ? res.output[0] : res.output;
                area.innerHTML = `<video autoplay loop muted playsinline style="width:100%; border-radius:15px; border: 4px solid var(--accent);"><source src="${url}" type="video/mp4"></video>`;
                document.getElementById('fit-action-btn').style.display = 'none';
                document.getElementById('add-to-cart-btn').style.display = 'block';
            }
        }, 5000);
    } catch (e) { area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('add-to-cart-btn').style.display = 'none';
};