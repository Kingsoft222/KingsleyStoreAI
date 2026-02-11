/**
 * Kingsley Store AI - Core Logic v3.3
 * FIXED: Vertex Photo Try-On Data Pass & Gemini Mic Integration
 * PRESERVED: UI, Colors, Greetings, and Cart Logic
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

// --- 1. BOOTSTRAP (PRESERVING ALL FIXES) ---
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

    // --- MIC FUNCTIONALITY (GEMINI STYLE) ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        micBtn.addEventListener('click', () => {
            try {
                recognition.start();
                micBtn.classList.add('recording-pulse');
                aiInput.placeholder = "Listening...";
            } catch (e) {
                recognition.stop();
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            aiInput.value = transcript;
            stopRecordingUI();
            executeSearch(); // Automatically trigger search after speaking
        };

        recognition.onerror = () => stopRecordingUI();
        recognition.onend = () => stopRecordingUI();

        function stopRecordingUI() {
            micBtn.classList.remove('recording-pulse');
            aiInput.placeholder = "Search Senator or Ankara...";
        }
    }
});

// --- 2. PROFILE ACTIONS ---
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

window.clearProfileData = () => {
    if (confirm("Remove profile photo?")) {
        localStorage.removeItem('kingsley_profile_locked');
        userPhoto = "";
        const img = document.getElementById('owner-img');
        if (img) img.src = "images/kingsley.jpg";
        document.getElementById('save-btn').style.display = 'none';
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
        results.scrollIntoView({ behavior: 'smooth' });
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
    resultArea.innerHTML = ""; 
    uploadBtn.style.display = 'block';
    uploadBtn.innerText = "Upload Photo";
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

// --- 4. ENGINES (CORRECTED DATA HAND-OFF) ---
async function startVertexModeling() {
    const area = document.getElementById('ai-fitting-result');
    const cartBtn = document.getElementById('add-to-cart-btn');
    area.innerHTML = `<p style="color:#555; text-align:center;">Processing photo result...</p>`;
    
    try {
        const response = await fetch('/.netlify/functions/process-vertex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                image: userPhoto, 
                cloth: selectedCloth.name 
            })
        });
        
        const data = await response.json();
        
        if (data.outputImage) {
            area.innerHTML = `<img src="${data.outputImage}" style="width:100%; border-radius:15px; border: 4px solid var(--accent);">`;
            document.getElementById('fit-action-btn').style.display = 'none';
            if (cartBtn) cartBtn.style.display = 'block';
        } else {
            throw new Error("Modeling failed. Please try a clearer photo.");
        }
    } catch (e) { 
        area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; 
    }
}

async function startModeling() {
    const area = document.getElementById('ai-fitting-result');
    const cartBtn = document.getElementById('add-to-cart-btn');
    area.innerHTML = `<p style="color:#555; text-align:center;">Sewing video result...</p>`;
    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
                if (cartBtn) cartBtn.style.display = 'block';
            }
        }, 5000);
    } catch (e) { area.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`; }
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('add-to-cart-btn').style.display = 'none';
};