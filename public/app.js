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

// 1. GREETING ROTATION (Restored)
setInterval(() => {
    const el = document.getElementById('dynamic-greeting');
    if (el) {
        gIndex = (gIndex + 1) % greetings.length;
        el.innerText = greetings[gIndex];
    }
}, 1000);

// 2. SEARCH & ORIGINAL MIC
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

// 3. FULL-SCREEN VIDEO LOGIC
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
        
        let checkInterval = setInterval(async () => {
            subtext.innerText = "Sewing your outfit & preparing video... (30-90s)";
            const check = await fetch(`/.netlify/functions/check-ai?id=${data.predictionId}`);
            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                subtext.style.display = 'none';
                if(cartBtn) cartBtn.style.display = 'block'; 
                
                // URL Extraction (Handles arrays or objects)
                let finalUrl = result.output;
                if (Array.isArray(finalUrl)) finalUrl = finalUrl[0];
                if (typeof finalUrl === 'object') finalUrl = finalUrl.url; 

                // FORCE FULL-SCREEN MODAL OUTPUT
                resultArea.innerHTML = `
                    <div style="width:100% !important; height:auto; position:relative; display:block;">
                        <video id="v-player" autoplay loop muted playsinline style="width:100% !important; display:block; border-radius:15px; border: 4px solid #ffd700;">
                            <source src="${finalUrl}" type="video/mp4">
                        </video>
                        <div style="position:absolute; bottom:15px; right:15px; width:70px; height:70px; border-radius:50%; border:3px solid white; overflow:hidden; z-index:100;">
                            <img src="${userPhoto}" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                    </div>
                `;
                
                // FORCE THE VIDEO TO "WAKE UP"
                const player = document.getElementById('v-player');
                player.load();
                player.play();

            } else if (result.status === "failed") {
                clearInterval(checkInterval);
                throw new Error("AI modeling failed.");
            }
        }, 5000);

    } catch (e) {
        subtext.innerText = "Error: " + e.message;
        btn.style.display = 'block';
    }
}

// REST OF YOUR FUNCTIONS (CLOSE MODAL, ETC)
window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('fit-action-btn').style.display = 'block';
};