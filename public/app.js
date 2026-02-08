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

// 1. GREETING ROTATION
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

// 2. SEARCH & MIC (Restored to Original)
const micBtn = document.getElementById('mic-btn');
if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-NG';
    micBtn.onclick = () => {
        recognition.start();
        micBtn.style.color = "red";
    };
    recognition.onresult = (e) => {
        document.getElementById('ai-input').value = e.results[0][0].transcript;
        micBtn.style.color = "black";
        executeSearch();
    };
}

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        selectedCloth = matched[0];
        detectedGender = input.match(/ankara|dinner|nne|babe|baddie/) ? "female" : "male";
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

// 3. PROFILE & UPLOAD (Re-enabled & Never to be touched again)
window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = () => { 
        document.getElementById('owner-img').src = reader.result; 
        localStorage.setItem('kingsley_profile_locked', reader.result);
    };
    reader.readAsDataURL(e.target.files[0]);
};

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
            
            // Re-enable the Action Button
            const btn = document.getElementById('fit-action-btn');
            btn.innerText = "Rock your cloth";
            btn.style.display = "block";
            btn.onclick = startModeling;
        };
    };
    reader.readAsDataURL(file);
};

// 4. FULL-SCREEN VIDEO OUTPUT LOGIC
async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const subtext = document.getElementById('modal-subtext');
    const btn = document.getElementById('fit-action-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    
    btn.style.display = 'none';
    subtext.innerText = "Connecting to AI Stylist...";

    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img, gender: detectedGender })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "AI Brain Offline");

        let checkInterval = setInterval(async () => {
            subtext.innerText = "Sewing your outfit & preparing video... (30-90s)";
            const check = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`);
            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                subtext.style.display = 'none';
                if(cartBtn) cartBtn.style.display = 'block'; 
                
                let finalUrl = result.output;
                if (Array.isArray(finalUrl)) finalUrl = finalUrl[0];
                if (typeof finalUrl === 'object') finalUrl = finalUrl.url; 

                // RESTORED FULL-SCREEN PRESENTATION
                resultArea.innerHTML = `
                    <div style="width:100% !important; height:auto; position:relative; display:block;">
                        <video id="v-player-final" autoplay loop muted playsinline style="width:100% !important; border-radius:15px; border: 4px solid #ffd700;">
                            <source src="${finalUrl}" type="video/mp4">
                        </video>
                        <div style="position:absolute; bottom:15px; right:15px; width:75px; height:75px; border-radius:50%; border:3px solid white; overflow:hidden; z-index:99;">
                            <img src="${userPhoto}" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                    </div>
                `;
                
                const player = document.getElementById('v-player-final');
                player.load();
                player.play();

            } else if (result.status === "failed") {
                clearInterval(checkInterval);
                throw new Error("Modeling failed. Try again.");
            }
        }, 5000);

    } catch (e) {
        subtext.innerText = "Style Check Failed: " + e.message;
        btn.style.display = 'block';
    }
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('fit-action-btn').style.display = 'block';
};