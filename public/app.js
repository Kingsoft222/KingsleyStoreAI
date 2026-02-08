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

// 1. FAST HYPE
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

// 2. SEARCH & TRIGGER
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
            <div class="result-card">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';
        setTimeout(() => { 
            const modal = document.getElementById('fitting-room-modal');
            if(modal) modal.style.display = 'flex'; 
        }, 1500);
    }
};

// AUTO-OPTIMIZER
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
            userPhoto = canvas.toDataURL('image/jpeg', 0.8); 
            
            const btn = document.getElementById('fit-action-btn');
            if(btn) {
                btn.innerText = "Rock your cloth";
                btn.onclick = startModeling;
            }
        };
    };
    reader.readAsDataURL(file);
};

// 3. THE REFINED VIDEO LOGIC
async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const subtext = document.getElementById('modal-subtext');
    const btn = document.getElementById('fit-action-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    
    if(btn) btn.style.display = 'none';
    if(subtext) subtext.innerText = "Contacting AI Stylist...";

    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img, gender: detectedGender })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "AI Brain Offline");

        let checkInterval = setInterval(async () => {
            if(subtext) subtext.innerText = "Sewing your outfit & preparing video... (30-90s)";
            
            const check = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`);
            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                if(subtext) subtext.style.display = 'none';
                if(cartBtn) cartBtn.style.display = 'block'; 
                
                // --- BULLETPROOF VIDEO URL CHECK ---
                // Replicate output can be a string OR an array of strings.
                let finalUrl = result.output;
                if (Array.isArray(finalUrl)) {
                    finalUrl = finalUrl[0]; 
                }

                if (!finalUrl) {
                    throw new Error("AI finished but no video link was found.");
                }

                console.log("Success! Playing Video:", finalUrl);

                resultArea.innerHTML = `
                    <div class="showroom-video-box" style="position:relative; width:100%; text-align:center;">
                        <video autoplay loop muted playsinline style="width:100%; max-height:500px; border-radius:15px; border: 4px solid #ffd700; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                            <source src="${finalUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                        <div style="position:absolute; bottom:15px; right:15px; width:60px; height:60px; border-radius:50%; border:2px solid gold; overflow:hidden; background:white;">
                            <img src="${userPhoto}" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                    </div>
                `;
            } else if (result.status === "failed") {
                clearInterval(checkInterval);
                throw new Error("Modeling failed. Please try a clearer front-facing photo.");
            }
        }, 4000);

    } catch (e) {
        if(subtext) subtext.innerText = "Style Check Failed: " + e.message;
        if(btn) {
            btn.style.display = 'block';
            btn.innerText = "Try Again";
        }
    }
}

// 4. CLOSING & UTILS
window.closeFittingRoom = () => {
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    if(modal) modal.style.display = 'none';
    if(resultArea) resultArea.innerHTML = '';
    const subtext = document.getElementById('modal-subtext');
    const btn = document.getElementById('fit-action-btn');
    if(subtext) { subtext.style.display = 'block'; subtext.innerText = ""; }
    if(btn) btn.style.display = 'block';
};