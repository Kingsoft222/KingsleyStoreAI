/**
 * Kingsley Mall - Core v19.0 (FUNCTIONAL RESTORE)
 * FOCUS: Fixed Send Button & Instant Cloth Swap.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;

// --- 1. SEARCH & SEND BUTTON RESTORE ---
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!results) return;

    const matched = clothesCatalog.filter(i => 
        i.name.toLowerCase().includes(input) || i.tags.toLowerCase().includes(input)
    );

    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" style="width:100%; border-radius:10px;">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    }
};

// --- 2. VTO HANDSHAKE ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button id="vto-start-btn" class="primary-btn" style="background:#e60023; color:white; width:100%; padding:15px; border-radius:12px; border:none; font-weight:bold; cursor:pointer;">📸 See How You Look (Photo)</button>
    `;
    document.getElementById('vto-start-btn').onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        window.startSwapProcess();
    };
    reader.readAsDataURL(e.target.files[0]);
};

// --- 3. THE CLOTH WEARING ENGINE ---
window.startSwapProcess = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const modal = document.getElementById('video-experience-modal');
    modal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `<div style="color:white;text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Wearing your outfit...</p></div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        if (data.result) {
            // THE GOAL: STILL PHOTO DISPLAY
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block;">`;
            document.getElementById('video-bottom-section').innerHTML = `<button onclick="window.addToCart()" class="primary-btn" style="background:#28a745; color:white; width:280px; margin-top:20px;">Add to Cart 🛒</button>`;
        }
    } catch (e) {
        container.innerHTML = "<p style='color:white;'>Error swapping cloth. Please try again.</p>";
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };