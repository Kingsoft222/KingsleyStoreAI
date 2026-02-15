/**
 * Kingsley Store AI - v12.6
 * FIXED: "See how you look" button connection.
 * FIXED: Still photo swap handshake.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;

document.addEventListener('DOMContentLoaded', () => {
    // Restore profile if exists
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { 
        const ownerImg = document.getElementById('owner-img');
        if(ownerImg) ownerImg.src = saved; 
        userPhoto = saved; 
    }

    // Mic logic check
    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
            rec.onresult = (e) => {
                document.getElementById('ai-input').value = e.results[0][0].transcript;
                micBtn.style.color = "#5f6368";
                window.executeSearch();
            };
        }
    }
});

// SEARCH
window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!results) return;

    const matched = clothesCatalog.filter(i => i.name.toLowerCase().includes(input) || i.tags.toLowerCase().includes(input));
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})">
                <img src="images/${item.img}" style="width:100%; height:140px; object-fit:contain;">
                <h4>${item.name}</h4>
                <p style="color:#e60023; font-weight:bold;">${item.price}</p>
            </div>
        `).join('');
    }
};

// --- THE FIX: BUTTON HANDSHAKE ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    const modal = document.getElementById('fitting-room-modal');
    const resultArea = document.getElementById('ai-fitting-result');
    
    if (modal && resultArea) {
        modal.style.display = 'flex';
        // We inject the button and EXPLICITLY set the onclick right here
        resultArea.innerHTML = `
            <button id="vto-photo-btn" class="primary-btn" style="background:#e60023; color:white; width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold; cursor:pointer;">📸 See How You Look (Photo)</button>
        `;
        
        document.getElementById('vto-photo-btn').onclick = () => {
            document.getElementById('user-fit-input').click();
        };
    }
};

// This handles the file once selected from the gallery
window.handleUserFitUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        // Proceed directly to the swap
        window.startVertexModeling();
    };
    reader.readAsDataURL(file);
};

window.startVertexModeling = async () => {
    // Hide the selection modal and show the result modal
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    
    const container = document.getElementById('video-main-container');
    container.innerHTML = `<div style="color:white;text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Swapping Outfit...</p></div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        if (data.result) {
            // Displaying the still result immediately
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block;">`;
        } else {
            container.innerHTML = `<p style="color:white;">AI Error. Please try a clearer photo.</p>`;
        }
    } catch (e) { 
        container.innerHTML = "<p style='color:white;'>Network Error. Try again.</p>"; 
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeVideoModal = () => { document.getElementById('video-experience-modal').style.display = 'none'; };