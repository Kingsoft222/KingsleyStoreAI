/**
 * Kingsley Store AI - v52.0 "The No-Shake Unveil"
 * FIX: Broken image shaking by using Auto-MIME Blobs.
 * PATTERN: Locked Countdown Spinner.
 */

const clothesCatalog = [
    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }
];

let userPhoto = "";
let selectedCloth = null;
let aiResultPending = null;

// --- 1. IMAGE HELPERS ---
async function compressImage(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
}

async function getBase64FromUrl(url) {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
    });
}

// --- 2. THE ENGINE ---
window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        userPhoto = await compressImage(event.target.result);
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
        <div id="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100%; color:white; background:#000; text-align:center;">
            <div style="position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
                <i class="fas fa-circle-notch fa-spin fa-4x" style="color:#e60023; position:absolute;"></i>
                <div id="countdown-timer" style="font-size:2rem; font-weight:900; color:white; z-index:10;">12</div>
            </div>
            <h3 style="font-weight:800; margin-top:30px; text-transform:uppercase; letter-spacing:2px;">Final Touches</h3>
            <p style="color:#666; font-size:0.9rem; margin-top:10px;">Unveiling your ${selectedCloth.name}...</p>
        </div>
    `;

    let timeLeft = 12;
    const timerInterval = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.innerText = timeLeft > 0 ? timeLeft : 0;
        
        if (timeLeft <= -5) { 
            clearInterval(timerInterval);
            window.finalUnveil();
        }
    }, 1000);

    try {
        const catalogBase64 = await getBase64FromUrl(`images/${selectedCloth.img}`);
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userPhoto.split(',')[1], 
                clothImage: catalogBase64, 
                clothName: selectedCloth.name 
            })
        });
        const data = await response.json();
        
        if (data.result) {
            aiResultPending = data.result;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                window.finalUnveil();
            }
        }
    } catch (e) {
        aiResultPending = "ERROR";
    }
};

window.finalUnveil = () => {
    const container = document.getElementById('video-main-container');
    
    if (!aiResultPending || aiResultPending === "ERROR" || aiResultPending.length < 500) {
        container.innerHTML = `<div style="color:white; padding:40px; text-align:center;">
            <h3 style="color:#e60023;">TAILOR IS BUSY</h3>
            <button onclick="location.reload()" style="margin-top:20px; background:white; color:black; border:none; padding:12px 25px; border-radius:50px; font-weight:bold;">RETRY</button>
        </div>`;
        return;
    }

    // --- THE "NO-SHAKE" FIX: AUTO-TYPE BLOB ---
    const cleanData = aiResultPending.replace(/[^A-Za-z0-9+/=]/g, "");
    const byteCharacters = atob(cleanData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // We leave the type generic so the browser's internal engine detects it
    const blob = new Blob([byteArray]); 
    const blobUrl = URL.createObjectURL(blob);

    container.innerHTML = `
        <div style="width:100%; height:100dvh; display:flex; flex-direction:column; background:#000; position:fixed; inset:0; overflow:hidden; z-index:99999;">
            <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden; padding-bottom:120px;">
                <img src="${blobUrl}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:block;">
            </div>
            <div style="position:absolute; bottom:0; width:100%; padding:20px 20px 60px; background:linear-gradient(transparent, #000 70%); display:flex; flex-direction:column; align-items:center;">
                <button style="background:#e60023; color:white; width:100%; max-width:400px; height:60px; border-radius:50px; font-weight:800; border:none;" onclick="location.reload()">ADD TO CART 🛒</button>
            </div>
        </div>
    `;
};