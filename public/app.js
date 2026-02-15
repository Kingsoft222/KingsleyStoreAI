/**
 * Kingsley Store AI - v12.0
 * GOAL: Instant Save Reflection + Still Photo Swap.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;

// --- 1. PROFILE PHOTO: INSTANT REFLECTION ---
window.handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const imgData = event.target.result;
        document.getElementById('owner-img').src = imgData;
        localStorage.setItem('kingsley_profile_locked', imgData);
        userPhoto = imgData;

        // Force button to show and turn green immediately
        const saveBtn = document.getElementById('fit-action-btn');
        if (saveBtn) {
            saveBtn.style.display = 'block';
            saveBtn.innerText = "Profile Saved ✅";
            saveBtn.style.background = "#28a745";
            saveBtn.style.color = "white";
            setTimeout(() => { saveBtn.style.display = 'none'; }, 2000);
        }
    };
    reader.readAsDataURL(file);
};

// --- 2. VTO: STILL PHOTO SWAP ---
window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <button onclick="window.initiateUploadFlow()" class="primary-btn" style="background:#e60023; color:white; width:100%; padding:15px; border-radius:10px; border:none; font-weight:bold;">📸 See How You Look (Photo)</button>
    `;
};

window.initiateUploadFlow = () => {
    const btn = document.getElementById('fit-action-btn');
    btn.style.display = 'block';
    btn.innerText = "Step 1: Upload Your Photo";
    btn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Step 2: Swap Outfit Now";
        btn.onclick = window.startVertexModeling;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.startVertexModeling = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const videoModal = document.getElementById('video-experience-modal');
    videoModal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `<div style="color:white;text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Swapping Outfit...</p></div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        
        if (data.result) {
            // STILL PHOTO ONLY - No Effects
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block;">`;
            document.getElementById('video-bottom-section').innerHTML = `<button onclick="location.reload()" class="primary-btn" style="background:#333; color:white; width:200px; margin-top:20px;">Done</button>`;
        }
    } catch (e) {
        container.innerHTML = "<p style='color:white;'>Error. Check connection.</p>";
    }
};

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };