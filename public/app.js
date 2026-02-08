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

// 1. GREETINGS
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

// 2. SEARCH & MIC (WhatsApp Style)
const micBtn = document.getElementById('mic-btn');
const searchInput = document.getElementById('ai-input');

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';

    micBtn.onclick = () => {
        recognition.start();
        micBtn.innerHTML = "🎤 <span style='color:red; font-size:0.7rem; font-weight:bold;'>Recording...</span>";
        micBtn.style.transform = "scale(1.2)";
    };

    recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        searchInput.value = transcript;
        executeSearch();
    };

    recognition.onend = () => {
        micBtn.innerHTML = "🎤";
        micBtn.style.transform = "scale(1)";
    };
}

window.executeSearch = () => {
    const input = searchInput.value.toLowerCase();
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
        setTimeout(() => { document.getElementById('fitting-room-modal').style.display = 'flex'; }, 1500);
    }
};

// 3. PHOTO UPLOAD
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
            document.getElementById('fit-action-btn').innerText = "Rock your cloth";
            document.getElementById('fit-action-btn').onclick = startModeling;
        };
    };
    reader.readAsDataURL(file);
};

// 4. THE VIDEO FIX (Bulletproof Display)
async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const subtext = document.getElementById('modal-subtext');
    const btn = document.getElementById('fit-action-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    
    btn.style.display = 'none';
    subtext.innerText = "Contacting AI Stylist...";

    try {
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ face: userPhoto, cloth: selectedCloth.img, gender: detectedGender })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "AI Error");

        let checkInterval = setInterval(async () => {
            subtext.innerText = "Sewing your outfit & preparing video... (30-90s)";
            const check = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`);
            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                
                // Get the video URL strictly
                let finalUrl = result.output;
                if (Array.isArray(finalUrl)) finalUrl = finalUrl[0];

                subtext.style.display = 'none';
                if(cartBtn) cartBtn.style.display = 'block'; 

                // FORCE DISPLAY INTO resultArea
                resultArea.innerHTML = `
                    <div style="width:100%; text-align:center; background:#000; border-radius:15px; overflow:hidden; border: 3px solid #ffd700;">
                        <video autoplay loop muted playsinline style="width:100%; display:block;">
                            <source src="${finalUrl}" type="video/mp4">
                        </video>
                    </div>
                `;
            } else if (result.status === "failed") {
                clearInterval(checkInterval);
                throw new Error("AI failed to process.");
            }
        }, 4000);

    } catch (e) {
        subtext.innerText = "Error: " + e.message;
        btn.style.display = 'block';
    }
}

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('fit-action-btn').style.display = 'block';
};