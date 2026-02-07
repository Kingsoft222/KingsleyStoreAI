// --- CATALOG DATA ---
const catalog = [
    { name: "Executive Red Senator", keywords: "senator red native dress dinner outfit", img: "senator_red.jpg", price: "₦25,000" },
    { name: "Royal Blue Agbada", keywords: "agbada native blue wedding dinner outfit", img: "agbada_blue.jpg", price: "₦45,000" },
    { name: "Black Italian Suit", keywords: "suit dinner black formal trousers blazer", img: "suit_black.jpg", price: "₦65,000" },
    { name: "Sky Blue Kaftan", keywords: "kaftan blue simple native senator", img: "kaftan_sky.jpg", price: "₦18,000" },
    { name: "Charcoal Wool Trousers", keywords: "trousers grey office stylish pants", img: "trousers_grey.jpg", price: "₦15,000" },
    { name: "Emerald Ankara Set", keywords: "ankara native pattern dinner outfit", img: "ankara_green.jpg", price: "₦22,000" }
];

let userPhotoFile = null;
let selectedClothUrl = "";

// --- 1. PROFILE PHOTO FIX (LOCKED) ---
window.addEventListener('load', () => {
    const saved = localStorage.getItem('kingsley_profile_img');
    if (saved) {
        document.getElementById('owner-img').src = saved;
    }
});

window.previewStoreOwnerPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            document.getElementById('owner-img').src = dataUrl;
            document.getElementById('save-profile-btn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
};

window.saveProfilePhoto = () => {
    const currentImg = document.getElementById('owner-img').src;
    localStorage.setItem('kingsley_profile_img', currentImg);
    document.getElementById('save-profile-btn').style.display = 'none';
    alert("Profile saved permanently!");
};

window.removeProfilePhoto = () => {
    localStorage.removeItem('kingsley_profile_img');
    document.getElementById('owner-img').src = 'images/kingsley.jpg';
    alert("Profile picture removed");
};

// --- 2. AUTOMATIC POPUP & NO-CROP SEARCH ---
window.applyPrompt = (query) => {
    if (!query) return;
    document.getElementById('ai-input').value = query;
    const results = document.getElementById('ai-results');
    const matches = catalog.filter(item => (item.name + item.keywords).toLowerCase().includes(query.toLowerCase()));
    
    document.getElementById('main-profile').style.display = 'none';
    document.getElementById('chips-area').style.display = 'none';
    results.style.display = 'grid';
    
    results.innerHTML = matches.map(item => `
        <div class="result-item" onclick="openFittingRoom('images/${item.img}')">
            <img src="images/${item.img}" style="object-fit: contain; width:100%; height:150px;" onerror="this.src='https://via.placeholder.com/150?text=Fashion'">
            <h4>${item.name}</h4>
            <p>${item.price}</p>
        </div>
    `).join('');

    // AUTOMATIC POPUP: If we find a match, open fitting room automatically
    if (matches.length > 0) {
        setTimeout(() => { openFittingRoom(`images/${matches[0].img}`); }, 500);
    }
};

document.getElementById('send-btn').onclick = () => window.applyPrompt(document.getElementById('ai-input').value);

// --- 3. MIC & VOICE ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.lang = 'en-NG';
    document.getElementById('voice-record-btn').onclick = () => { rec.start(); document.getElementById('recording-overlay').style.display = 'flex'; };
    rec.onresult = (e) => { 
        const t = e.results[0][0].transcript; 
        document.getElementById('ai-input').value = t; 
        document.getElementById('live-transcript').innerText = t; 
    };
    window.stopRecording = () => { rec.stop(); document.getElementById('recording-overlay').style.display = 'none'; window.applyPrompt(document.getElementById('ai-input').value); };
}

// --- 4. DYNAMIC ACTION BUTTON FIX ---
window.openFittingRoom = (imgUrl) => {
    selectedClothUrl = imgUrl;
    document.getElementById('try-on-area').style.display = 'flex';
};

window.handleFileUpload = (e) => {
    userPhotoFile = e.target.files[0];
    if (userPhotoFile) {
        document.getElementById('upload-status').innerText = "✅ Photo Ready";
        // CRITICAL FIX: Change button text immediately
        document.getElementById('action-btn').innerText = "Generate new look";
    }
};

window.triggerAction = async () => {
    const btn = document.getElementById('action-btn');
    if (btn.innerText === "Upload your image") {
        document.getElementById('user-photo').click();
        return;
    }

    btn.innerText = "Modeling Full Look...";
    btn.disabled = true;
    const container = document.getElementById('ai-output-container');
    container.innerHTML = `<div class="loading-spinner"></div><p style="text-align:center;">AI is placing you in a clothing store environment with your outfit...</p>`;

    try {
        const userBase64 = await toBase64(userPhotoFile);
        const resImg = await fetch(window.location.origin + '/' + selectedClothUrl);
        const blob = await resImg.blob();
        const garmentBase64 = await toBase64(blob);

        const aiResponse = await fetch('https://us-central1-kingsleystoreai.cloudfunctions.net/generateLook', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_image: userBase64, garment_image: garmentBase64 })
        });

        const data = await aiResponse.json();
        if (data.output_image) {
            const finalImg = `data:image/png;base64,${data.output_image}`;
            container.innerHTML = `
                <div style="border: 2px solid #ddd; border-radius: 15px; overflow: hidden; margin-top:15px;">
                    <img src="${finalImg}" style="width:100%; display: block;">
                </div>
                <button class="primary-btn" style="background:#25D366; margin-top:15px;" onclick="window.open('https://wa.me/?text=Check out my sharp look at Kingsley Store!')">Share on WhatsApp</button>
            `;
            btn.style.display = 'none';
            document.getElementById('done-btn').style.display = 'block';
        }
    } catch (err) {
        alert("AI Session failed. Please check connection.");
        btn.disabled = false;
        btn.innerText = "Generate new look";
    }
};

window.resetFittingRoom = () => {
    userPhotoFile = null;
    document.getElementById('upload-status').innerText = "No photo selected";
    document.getElementById('action-btn').innerText = "Upload your image";
    document.getElementById('action-btn').style.display = 'block';
    document.getElementById('action-btn').disabled = false;
    document.getElementById('ai-output-container').innerHTML = '';
    document.getElementById('done-btn').style.display = 'none';
};

window.closeFittingRoom = () => {
    document.getElementById('try-on-area').style.display = 'none';
    resetFittingRoom();
};

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = e => reject(e);
});