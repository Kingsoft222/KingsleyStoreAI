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

// --- 1. PERMANENT PROFILE MEMORY (Checks immediately on load) ---
window.addEventListener('DOMContentLoaded', () => {
    const savedProfile = localStorage.getItem('kingsley_profile_locked');
    if (savedProfile) {
        const ownerImg = document.getElementById('owner-img');
        if (ownerImg) ownerImg.src = savedProfile;
    }
});

// --- 2. PROFILE UPLOAD & SAVE (Fixed Visibility) ---
window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => { 
        const ownerImg = document.getElementById('owner-img');
        const saveBtn = document.getElementById('save-btn');
        
        if (ownerImg) ownerImg.src = reader.result; 
        if (saveBtn) saveBtn.style.display = 'inline-block'; // FORCED APPEARANCE
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveProfileData = () => {
    const currentImg = document.getElementById('owner-img').src;
    localStorage.setItem('kingsley_profile_locked', currentImg);
    document.getElementById('save-btn').style.display = 'none';
    alert("Profile saved permanently!");
};

// --- 3. SEARCH & PROMPT FLOW ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="selectItem(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';
    }
};

window.selectItem = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    if (modal) {
        modal.style.display = 'flex';
        detectedGender = selectedCloth.tags.match(/ankara|dinner|nne|babe|baddie/) ? "female" : "male";
    }
};

// --- 4. VIDEO MODELING LOGIC ---
window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            userPhoto = canvas.toDataURL('image/jpeg', 0.7); 
            
            const btn = document.getElementById('fit-action-btn');
            if (btn) {
                btn.innerText = "Rock your cloth";
                btn.style.display = "block";
                btn.onclick = startModeling;
            }
        };
    };
    reader.readAsDataURL(file);
};

async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const subtext = document.getElementById('modal-subtext');
    const btn = document.getElementById('fit-action-btn');
    
    if (btn) btn.style.display = 'none';
    if (subtext) subtext.innerText = "Connecting to AI Stylist...";

    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img, gender: detectedGender })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "AI Brain Offline");

        let checkInterval = setInterval(async () => {
            if (subtext) subtext.innerText = "Sewing your outfit... (30-90s)";
            const check = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`);
            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                if (subtext) subtext.style.display = 'none';
                
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
                
                const player = document.getElementById('v-player');
                if (player) {
                    player.load();
                    player.play();
                }

            } else if (result.status === "failed") {
                clearInterval(checkInterval);
                throw new Error("Modeling failed.");
            }
        }, 5000);

    } catch (e) {
        if (subtext) subtext.innerText = "Error: " + e.message;
        if (btn) btn.style.display = 'block';
    }
}

// --- 5. GREETINGS & UTILS ---
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('fit-action-btn').style.display = 'block';
};