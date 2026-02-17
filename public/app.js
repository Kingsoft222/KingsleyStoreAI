/**
 * Kingsley Store AI - v81.0 "The Binary Scalpel"
 * FIX: Shaking by surgically removing AI "Intro" and "Outro" chatter.
 * MAINTAINED: "Dressing You" terms and centered countdown.
 * UI: Pro 2-column Mall Grid (Locked).
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", tags: "luxury red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;

// --- 1. BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    const icon = document.querySelector('.search-box i');
    if (icon) {
        icon.style.cursor = "pointer";
        icon.onclick = (e) => { e.preventDefault(); window.executeSearch(); };
    }
});

// --- 2. SEARCH ENGINE ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input || !results) return;

    const matched = clothesCatalog.filter(item => 
        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)
    );

    results.style.display = 'grid';
    results.style.gridTemplateColumns = 'repeat(2, 1fr)';
    results.style.gap = '12px';
    results.style.padding = '10px';

    results.innerHTML = matched.map(item => `
        <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" 
             style="background:#111; border-radius:12px; overflow:hidden; border:1px solid #222; text-align:center; padding-bottom:10px;">
            <img src="images/${item.img}" style="width:100%; height:160px; object-fit:cover;">
            <h4 style="font-size:0.85rem; margin:8px 4px; color:white;">${item.name}</h4>
            <p style="color:#e60023; font-weight:900; margin:0;">${item.price}</p>
        </div>`).join('');
};

// --- 3. THE ENGINE ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="document.getElementById('user-fit-input').click()" 
                style="background:#e60023; color:white; border-radius:50px; padding:18px; border:none; width:100%; font-weight:800; cursor:pointer;">
            📸 SELECT STANDING PHOTO
        </button>`;
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startVertexModeling();
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    aiResultPending = null; 

    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; background:#000; color:white; text-align:center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin" style="color:#e60023; font-size: 4rem;"></i>
                <div id="countdown-timer" style="position:absolute; font-size:1.6rem; font-weight:900; top:50%; left:50%; transform:translate(-50%, -50%);">12</div>
            </div>
            <h3 style="margin-top:25px; font-weight:800;">DRESSING YOU...</h3>
        </div>`;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
    }, 1000);

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], clothName: selectedCloth.name })
        });
        
        const data = await response.json();
        aiResultPending = data.result || (data.candidates && data.candidates[0].content.parts[0].text) || data;
        
        clearInterval(timerInterval);
        window.finalUnveil();
    } catch (e) { 
        aiResultPending = "ERROR"; 
        window.finalUnveil();
    }
};

window.finalUnveil = () => {
    const container = document.getElementById('video-main-container');
    let rawStr = typeof aiResultPending === 'string' ? aiResultPending : JSON.stringify(aiResultPending);
    
    if (!rawStr || rawStr.length < 500) {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>RETRY</h3><button onclick="location.reload()" style="background:#e60023; color:white; border:none; padding:15px 30px; border-radius:50px; margin-top:20px;">REFRESH</button></div>`;
        return;
    }

    // THE BINARY SCALPEL
    // 1. Hunt for the markers
    const markers = ["iVBOR", "/9j/", "UklGR"];
    let startIdx = -1;
    for (let m of markers) {
        let pos = rawStr.indexOf(m);
        if (pos !== -1) { startIdx = pos; break; }
    }

    if (startIdx === -1) {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;"><h3>FORMAT ERROR</h3><button onclick="location.reload()">RETRY</button></div>`;
        return;
    }

    // 2. Cut the intro
    let cleanCode = rawStr.substring(startIdx);

    // 3. Cut the outro (Remove everything after the last valid Base64 character)
    // Most AI responses end with a quote or a backtick - we kill those.
    cleanCode = cleanCode.replace(/[^A-Za-z0-9+/=].*$/, "");

    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="data:image/png;base64,${cleanCode}" 
                     style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;"
                     onerror="this.src='data:image/jpeg;base64,${cleanCode}'">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 0 60px 0; background:linear-gradient(transparent, #000 70%); display:flex; justify-content:center;">
                <button style="background:#e60023; color:white; width:90vw; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none;" onclick="location.reload()">ADD TO CART 🛒</button>
            </div>
        </div>`;
};