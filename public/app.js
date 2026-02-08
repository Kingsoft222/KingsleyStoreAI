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

// --- 1. INITIALIZATION & PERSISTENCE ---
window.addEventListener('DOMContentLoaded', () => {
    const savedProfile = localStorage.getItem('kingsley_profile_locked');
    if (savedProfile) {
        const ownerImg = document.getElementById('owner-img');
        if (ownerImg) ownerImg.src = savedProfile;
        userPhoto = savedProfile;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            gIndex = (gIndex + 1) % greetings.length;
            el.innerText = greetings[gIndex];
        }
    }, 1000);
});

// --- 2. PROFILE ACTIONS (FIXED REMOVE BUTTON) ---
window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => { 
        const ownerImg = document.getElementById('owner-img');
        const saveBtn = document.getElementById('save-btn');
        if (ownerImg) ownerImg.src = reader.result; 
        if (saveBtn) saveBtn.style.display = 'inline-block';
        userPhoto = reader.result;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveProfileData = () => {
    if (userPhoto) {
        localStorage.setItem('kingsley_profile_locked', userPhoto);
        document.getElementById('save-btn').style.display = 'none';
        alert("Profile locked!");
    }
};

// FULLY FUNCTIONAL REMOVE BUTTON
window.removeProfilePhoto = () => {
    const ownerImg = document.getElementById('owner-img');
    const saveBtn = document.getElementById('save-btn');
    
    // Transparent pixel to visually "clear" the frame
    const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    
    if (confirm("Remove profile photo?")) {
        localStorage.removeItem('kingsley_profile_locked');
        userPhoto = "";
        if (ownerImg) {
            ownerImg.src = transparentPixel; 
            // Optional: If you have a default person icon, use that instead of transparentPixel
            // ownerImg.src = "images/default-avatar.png"; 
        }
        if (saveBtn) saveBtn.style.display = 'none';
        console.log("Profile cleared from memory and UI.");
    }
};

// --- 3. SEARCH & SHOWROOM CHOICE ---
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
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    if (modal) modal.style.display = 'flex';
    
    // UPDATED: No "Upload Photo" button above choices
    resultArea.innerHTML = `
        <div id="choice-container" style="text-align:center; padding: 20px;">
            <h2 style="color:#d90429; margin-bottom:10px;">AI Showroom</h2>
            <p style="color:white; margin-bottom:25px;">Select how you want to see yourself in this outfit</p>
            <div style="display:flex; flex-direction:column; gap:15px; align-items:center;">
                <button onclick="prepareModeling('photo')" style="width:280px; background:#ffd700; color:black; padding:18px; border-radius:12px; border:none; cursor:pointer; font-weight:bold; font-size:16px;">
                    📸 See How You Look (Photo)
                </button>
                <button onclick="prepareModeling('video')" style="width:280px; background:#333; color:white; padding:18px; border-radius:12px; border:1px solid #ffd700; cursor:pointer; font-weight:bold; font-size:16px;">
                    🎥 See How You Look (Video)
                </button>
            </div>
        </div>
    `;
};

// --- 4. THE VIRTUAL TRY-ON FLOW ---
let currentMode = 'photo';
window.prepareModeling = (mode) => {
    currentMode = mode;
    const resultArea = document.getElementById('ai-fitting-result');
    
    // UPDATED: No double buttons. Just the transformational action.
    resultArea.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <p id="modal-subtext" style="color:white; margin-bottom:20px;">Upload your full photo to generate the ${mode} result</p>
            <input type="file" id="user-fit-input" accept="image/*" onchange="handleModelingUpload(event)" style="display:none;">
            <button id="fit-action-btn" onclick="document.getElementById('user-fit-input').click()" style="background:#ffd700; color:black; padding:15px 30px; border-radius:10px; border:none; font-weight:bold; cursor:pointer; font-size:16px;">
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
            subtext.innerText = "Ready! Tap the button to see the result.";
            btn.onclick = (currentMode === 'photo') ? startVertexModeling : startModeling;
        }
    };
    reader.readAsDataURL(file);
};

// --- 5. AI ENGINES ---
async function startVertexModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    resultArea.innerHTML = `<p style="color:white; text-align:center; margin-top:20px;">Generating your photo style...</p>`;
    
    try {
        const response = await fetch('/.netlify/functions/process-vertex', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img })
        });
        const data = await response.json();
        
        resultArea.innerHTML = `
            <div style="width:100% !important; text-align:center;">
                <img src="${data.outputImage}" style="width:100% !important; border-radius:15px; border: 4px solid #ffd700;">
                <p style="color:gold; margin-top:15px; font-weight:bold;">PHOTO RESULT READY</p>
            </div>
        `;
    } catch (e) {
        resultArea.innerHTML = `<p style="color:red; text-align:center;">Error: ${e.message}</p>`;
    }
}

async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    resultArea.innerHTML = `<p style="color:white; text-align:center; margin-top:20px;">Sewing your video result...</p>`;

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
                let finalUrl = Array.isArray(result.output) ? result.output[0] : (result.output.url || result.output);
                resultArea.innerHTML = `
                    <video autoplay loop muted playsinline style="width:100%; border-radius:15px; border: 4px solid #ffd700;">
                        <source src="${finalUrl}" type="video/mp4">
                    </video>
                    <p style="color:gold; margin-top:15px; font-weight:bold;">VIDEO RESULT READY</p>`;
            }
        }, 5000);
    } catch (e) {
        resultArea.innerHTML = `<p style="color:red; text-align:center;">Error: ${e.message}</p>`;
    }
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
};