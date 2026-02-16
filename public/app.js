/**
 * Kingsley Store AI - v47.0 "The Exact Match"
 * METHOD: Dual-Image Reference (Catalog Product + User Photo).
 * RENDERING: Blob URL (To fix the "Blank Image" bug).
 * PATTERN: Permanent Countdown Spinner.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

const greetings = [
    "Chief, looking for premium native?", 
    "Boss, let's find your style!", 
    "Classic Man, what are you looking for today?",
    "Nne, what are you looking for today?",
    "Classic Babe, let's find your style!"
];

let gIndex = 0;
let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;
let cartCount = 0;

// --- 1. BOOTSTRAP & GREETINGS ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('kingsley_profile_locked');
    const ownerImg = document.getElementById('owner-img');
    if (saved && ownerImg) {
        ownerImg.src = saved;
        userPhoto = saved;
    }
    
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 3000);
});

// Helper: Convert Catalog Image to Base64
async function getBase64FromUrl(url) {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result;
            resolve(base64data.split(',')[1]);
        };
    });
}

// Profile Logic
window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        document.getElementById('owner-img').src = userPhoto;
        localStorage.setItem('kingsley_profile_locked', userPhoto);
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 2. SEARCH ENGINE (RESTORED SEND ICON) ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim() || !results) return;

    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" alt="${item.name}">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.quickSearch = (q) => { 
    document.getElementById('ai-input').value = q; 
    window.executeSearch(); 
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" class="primary-btn" style="background:#e60023; color:white; border-radius:50px; padding:15px; border:none; width:100%; font-weight:800; cursor:pointer;">📸 UPLOAD PHOTO</button>
    `;
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startVertexModeling();
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 3. THE ZERO-HOUR ENGINE (EXACT MATCH METHOD) ---
window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    aiResultPending = null; 

    // YOUR LOCKED PATTERN (SPINNER + COUNTDOWN)
    container.innerHTML = `
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin fa-4x" style="color:#e60023; position:absolute;"></i>
                <div id="countdown-timer" style="font-size:2rem; font-weight:900; color:white; z-index:10;">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:30px; text-transform:uppercase; letter-spacing:2px; font-family:'Inter', sans-serif;">Mapping Exact Design</h3>
            <p style="color:#666; font-size:0.9rem; margin-top:10px;">Transferring ${selectedCloth.name} details...</p>
        </div>
    `;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (aiResultPending) window.injectWithBlob(aiResultPending);
            else {
                 const checkAgain = setInterval(() => {
                    if (aiResultPending) {
                        window.injectWithBlob(aiResultPending);
                        clearInterval(checkAgain);
                    }
                 }, 500);
                 setTimeout(() => clearInterval(checkAgain), 15000);
            }
        }
    }, 1000);

    try {
        const catalogBase64 = await getBase64FromUrl(`images/${selectedCloth.img}`);
        const userBase64 = userPhoto.includes(',') ? userPhoto.split(',')[1] : userPhoto;

        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userBase64, 
                clothImage: catalogBase64,
                clothName: selectedCloth.name 
            })
        });
        const data = await response.json();

        if (data.result && data.result.length > 500) {
            aiResultPending = data.result;
            if (timeLeft <= 0) window.injectWithBlob(aiResultPending);
        }
    } catch (e) {
        clearInterval(timerInterval);
        container.innerHTML = `<div style="color:white; padding:50px; text-align:center;">Handshake Error. Please Refresh.</div>`;
    }
};

window.injectWithBlob = (dataStr) => {
    const container = document.getElementById('video-main-container');
    
    const markers = ["iVBOR", "/9j/", "UklGR"];
    let startPos = -1;
    for (const m of markers) {
        let found = dataStr.indexOf(m);
        if (found !== -1) { startPos = found; break; }
    }
    let cleanData = (startPos !== -1) ? dataStr.substring(startPos) : dataStr;
    cleanData = cleanData.replace(/[^A-Za-z0-9+/=]/g, "");

    try {
        const byteCharacters = atob(cleanData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'image/png'});
        const blobUrl = URL.createObjectURL(blob);

        container.innerHTML = `
            <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
                <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                    <img src="${blobUrl}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
                </div>
                <div style="position:absolute; bottom:0; width:100%; padding:30px 20px 60px; background:linear-gradient(transparent, #000 60%); display:flex; flex-direction:column; align-items:center; z-index:100000;">
                    <button style="background:#e60023; color:white; width:100%; max-width:420px; height:60px; border-radius:50px; font-weight:800; border:none; cursor:pointer;" onclick="window.addToCart()">
                        ADD TO CART - ${selectedCloth.price} 🛒
                    </button>
                    <p onclick="location.reload()" style="color:#777; margin-top:20px; cursor:pointer; font-size:0.9rem; text-decoration:underline;">Try another design</p>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;">Decoding Error. AI pixels corrupted.</div>`;
    }
};

window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    alert("Added to bag! ✅");
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };