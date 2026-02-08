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
let detectedGender = "male";
let selectedBodyType = "slim"; 

// 1. FAST HYPE (1 Second)
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
        if (input.match(/ankara|dinner|nne|babe|baddie/)) {
            detectedGender = "female";
            document.getElementById('body-type-selector').style.display = 'block';
        } else {
            detectedGender = "male";
            document.getElementById('body-type-selector').style.display = 'none';
        }

        results.innerHTML = matched.map(item => `
            <div class="result-card">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
            </div>
        `).join('');
        results.style.display = 'grid';

        setTimeout(() => {
            document.getElementById('fitting-room-modal').style.display = 'flex';
        }, 2000);
    }
};

window.setBodyType = (type) => {
    selectedBodyType = type;
    const btns = document.querySelectorAll('.type-btn');
    btns.forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result; 
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Rock your cloth";
        btn.onclick = startModeling;
    };
    reader.readAsDataURL(e.target.files[0]);
};

// 3. DIAGNOSTIC MODELING LOGIC
async function startModeling() {
    const resultArea = document.getElementById('ai-fitting-result');
    const btn = document.getElementById('fit-action-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    const subtext = document.getElementById('modal-subtext');
    
    btn.style.display = 'none';
    subtext.innerText = "Connecting to AI Showroom Engine...";

    try {
        // Step A: Send request to Netlify Function
        const response = await fetch('/.netlify/functions/process-ai', {
            method: 'POST',
            body: JSON.stringify({ 
                face: userPhoto, 
                cloth: selectedCloth.img, 
                gender: detectedGender,
                body: selectedBodyType
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error: ${response.status} - ${errorText}`);
        }

        const { predictionId } = await response.json();

        // Step B: Poll for results
        let checkInterval = setInterval(async () => {
            subtext.innerText = "AI is re-painting the video with your face...";
            
            const check = await fetch(`/.netlify/functions/check-ai?id=${predictionId}`);
            if (!check.ok) throw new Error("Connection lost while checking status");

            const result = await check.json();

            if (result.status === "succeeded") {
                clearInterval(checkInterval);
                subtext.style.display = 'none';
                if(cartBtn) cartBtn.style.display = 'block'; 

                resultArea.innerHTML = `
                    <div class="showroom-video-box">
                        <video id="mod-vid" class="modeling-video" autoplay loop muted playsinline>
                            <source src="${result.videoUrl}" type="video/mp4">
                        </video>
                        <div class="user-identity-bubble">
                            <img src="${userPhoto}" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                    </div>
                `;
            } else if (result.status === "failed") {
                clearInterval(checkInterval);
                throw new Error("AI could not process this photo.");
            }
        }, 3000);

    } catch (e) {
        console.error("DIAGNOSTIC ERROR:", e);
        handleAIFailure(resultArea, subtext, btn, e.message);
    }
}

function handleAIFailure(area, sub, btn, errorMsg) {
    sub.innerText = "AI Connection Issue";
    area.innerHTML = `
        <div style="padding:30px; background:#fff5f5; border:2px dashed #ff4444; border-radius:20px; color:#cc0000; text-align:center;">
            <p style="font-weight:bold;">Try Again</p>
            <p style="font-size:0.85rem; margin-bottom:15px;">${errorMsg}</p>
            <p style="font-size:0.8rem; color:#666;">Tip: Use a smaller photo (under 2MB) and ensure your face is clearly visible.</p>
        </div>
    `;
    btn.style.display = 'block';
    btn.innerText = "Try Another Photo";
}

// 4. MIC, CART, & PROFILE 
const micBtn = document.getElementById('mic-btn');
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    micBtn.onclick = () => { recognition.start(); micBtn.style.color = "red"; };
    recognition.onresult = (e) => {
        document.getElementById('ai-input').value = e.results[0][0].transcript;
        micBtn.style.color = "black";
        executeSearch();
    };
    recognition.onend = () => { micBtn.style.color = "black"; };
}

window.addToCart = () => {
    const count = document.getElementById('cart-count');
    count.innerText = parseInt(count.innerText) + 1;
    alert(`${selectedCloth.name} added to cart!`);
};

window.closeFittingRoom = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('ai-fitting-result').innerHTML = '';
    document.getElementById('modal-subtext').style.display = 'block';
    document.getElementById('fit-action-btn').style.display = 'block';
    document.getElementById('add-to-cart-btn').style.display = 'none';
};

window.quickSearch = (t) => { document.getElementById('ai-input').value = t; executeSearch(); };

window.onload = () => {
    const s = localStorage.getItem('kingsley_profile_locked');
    if (s) document.getElementById('owner-img').src = s;
};

window.handleProfileUpload = (e) => {
    const r = new FileReader();
    r.onload = () => { 
        document.getElementById('owner-img').src = r.result; 
        document.getElementById('save-btn').style.display = 'inline-block'; 
    };
    r.readAsDataURL(e.target.files[0]);
};

window.saveProfileData = () => {
    localStorage.setItem('kingsley_profile_locked', document.getElementById('owner-img').src);
    document.getElementById('save-btn').style.display = 'none';
};

window.clearProfileData = () => {
    localStorage.removeItem('kingsley_profile_locked');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
};