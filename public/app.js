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

// --- 1. INITIALIZATION & PERMANENCE ---
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

// --- 2. PROFILE ACTIONS (FIXED REMOVE) ---
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

window.removeProfilePhoto = () => {
    if (confirm("Clear profile photo?")) {
        localStorage.removeItem('kingsley_profile_locked');
        userPhoto = "";
        const ownerImg = document.getElementById('owner-img');
        if (ownerImg) ownerImg.src = "images/default-avatar.png"; // Set to your default path
        document.getElementById('save-btn').style.display = 'none';
        alert("Cleared.");
    }
};

// --- 3. SEARCH & DUAL SHOWROOM CHOICE ---
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
    
    resultArea.innerHTML = `
        <div id="choice-container" style="text-align:center; padding: 20px;">
            <h3 style="color:white;">Select Your Experience</h3>
            <div style="display:flex; flex-direction:column; gap:15px; align-items:center; margin-top:20px;">
                <button onclick="prepareModeling('photo')" style="width:250px; background:#ffd700; color:black; padding:15px; border-radius:10px; border:none; cursor:pointer; font-weight:bold;">📸 AI Photo Showroom (Vertex)</button>
                <button onclick="prepareModeling('video')" style="width:250px; background:#333; color:white; padding:15px; border-radius:10px; border:1px solid #ffd700; cursor:pointer; font-weight:bold;">🎥 AI Video Showroom (Replicate)</button>
            </div>
        </div>
    `;
};

// --- 4. THE VIRTUAL TRY-ON FLOW (FIXED BUTTON TRANSFORM) ---
let currentMode = 'photo';
window.prepareModeling = (mode) => {
    currentMode = mode;
    const resultArea = document.getElementById('ai-fitting-result');
    
    // Restore the modeling UI inside the modal
    resultArea.innerHTML = `
        <div style="text-align:center;">
            <p id="modal-subtext" style="color:white; margin-bottom:15px;">Upload your photo to start ${mode} modeling</p>
            <input type="file" id="user-fit-input" accept="image/*" onchange="handleModelingUpload(event)" style="display:none;">
            <button id="fit-action-btn" onclick="document.getElementById('user-fit-input').click()" style="background:#ffd700; color:black; padding:12px 25px; border-radius:8px; border:none; font-weight:bold; cursor:pointer;">
                Upload Photo
            </button>
        </div>
    `;
};

window.handleModelingUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result; // Update the global photo
        const btn = document.getElementById('fit-action-btn');
        const subtext = document.getElementById('modal-subtext');
        
        // TRANSFORM BUTTON
        if (btn) {
            btn.innerText = "Rock your cloth";
            subtext.innerText = "Ready! Tap to see yourself in the " + selectedCloth.name;
            btn.onclick = (currentMode === 'photo') ? startVertexModeling : startModeling;
        }
    };
    reader.readAsDataURL(file);
};

// --- 5. AI ENGINES ---
async function startVertexModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    resultArea.innerHTML = `<p style="color:white; text-align:center;">Vertex AI is generating your photo...</p>`;
    
    try {
        const response = await fetch('/.netlify/functions/process-vertex', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img })
        });
        const data = await response.json();
        
        resultArea.innerHTML = `
            <div style="width:100% !important; text-align:center;">
                <img src="${data.outputImage}" style="width:100% !important; border-radius:15px; border: 4px solid #ffd700;">
                <p style="color:gold; margin-top:10px;">Vertex Results Ready!</p>
            </div>
        `;
    } catch (e) {
        resultArea.innerHTML = `<p style="color:red; text-align:center;">Vertex Error: ${e.message}</p>`;
    }
}

async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    resultArea.innerHTML = `<p style="color:white; text-align:center;">Starting Replicate Video Engine...</p>`;

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
                resultArea.innerHTML = `<video autoplay loop muted playsinline style="width:100%; border-radius:15px; border: 4px solid #ffd700;"><source src="${finalUrl}" type="video/mp4"></video>`;
            }
        }, 5000);
    } catch (e) {
        resultArea.innerHTML = `<p style="color:red; text-align:center;">Video Error: ${e.message}</p>`;
    }
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
};