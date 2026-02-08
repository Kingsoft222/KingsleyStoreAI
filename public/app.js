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
let detectedGender = "male";

// --- 1. PERMANENT PROFILE & INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    const savedProfile = localStorage.getItem('kingsley_profile_locked');
    if (savedProfile) {
        const ownerImg = document.getElementById('owner-img');
        if (ownerImg) ownerImg.src = savedProfile;
        userPhoto = savedProfile;
    }
    
    // Greeting interval
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) {
            gIndex = (gIndex + 1) % greetings.length;
            el.innerText = greetings[gIndex];
        }
    }, 1000);
});

// --- 2. PROFILE UPLOAD, SAVE & REMOVE ---
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
    const ownerImg = document.getElementById('owner-img');
    if (ownerImg && ownerImg.src) {
        localStorage.setItem('kingsley_profile_locked', ownerImg.src);
        document.getElementById('save-btn').style.display = 'none';
        alert("Profile saved permanently!");
    }
};

// Activated Remove (-) Button Logic
window.removeProfilePhoto = () => {
    const ownerImg = document.getElementById('owner-img');
    const defaultPlaceholder = "images/default-avatar.png"; // Replace with your default path
    
    if (confirm("Are you sure you want to remove your profile photo?")) {
        localStorage.removeItem('kingsley_profile_locked');
        if (ownerImg) ownerImg.src = defaultPlaceholder;
        userPhoto = "";
        document.getElementById('save-btn').style.display = 'none';
        alert("Profile photo removed.");
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
    const resultArea = document.getElementById('ai-fitting-result');
    const modal = document.getElementById('fitting-room-modal');
    
    if (modal) modal.style.display = 'flex';
    
    resultArea.innerHTML = `
        <div id="showroom-choice-menu" style="text-align:center; padding: 20px;">
            <h3 style="color:white;">Select Your Experience</h3>
            <p style="color:#ccc;">How would you like to see the ${selectedCloth.name}?</p>
            <div style="display:flex; flex-direction:column; gap:15px; align-items:center; margin-top:20px;">
                <button onclick="startVertexModeling()" style="width:250px; background:#ffd700; color:black; padding:15px; border-radius:10px; border:none; cursor:pointer; font-weight:bold;">
                    📸 AI Photo Showroom (Vertex)
                </button>
                <button onclick="startModeling()" style="width:250px; background:#333; color:white; padding:15px; border-radius:10px; border:1px solid #ffd700; cursor:pointer; font-weight:bold;">
                    🎥 AI Video Showroom (Replicate)
                </button>
            </div>
        </div>
    `;
};

// --- 4. MODELING ENGINES ---
async function startVertexModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    resultArea.innerHTML = `<p style="color:white; text-align:center;">Vertex AI is generating your photo...</p>`;
    
    try {
        const response = await fetch('/.netlify/functions/process-vertex', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        resultArea.innerHTML = `
            <div style="width:100% !important; text-align:center;">
                <img src="${data.outputImage}" style="width:100% !important; border-radius:15px; border: 4px solid #ffd700;">
                <p style="color:gold; margin-top:10px;">Vertex Photo Result</p>
            </div>
        `;
    } catch (e) {
        resultArea.innerHTML = `<p style="color:red; text-align:center;">Vertex Error: ${e.message}</p>`;
    }
}

async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    resultArea.innerHTML = `<p style="color:white; text-align:center;">Connecting to Replicate Video Engine...</p>`;

    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img, gender: detectedGender })
        });
        const data = await response.json();
        
        let checkInterval = setInterval(async () => {
            const check = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`);
            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                let finalUrl = result.output;
                if (Array.isArray(finalUrl)) finalUrl = finalUrl[0];
                if (typeof finalUrl === 'object') finalUrl = finalUrl.url; 

                resultArea.innerHTML = `
                    <div style="width:100% !important; position:relative; display:block;">
                        <video id="v-player" autoplay loop muted playsinline style="width:100% !important; border-radius:15px; border: 4px solid #ffd700;">
                            <source src="${finalUrl}" type="video/mp4">
                        </video>
                    </div>
                `;
                document.getElementById('v-player').play();
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