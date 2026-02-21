import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e"
};
initializeApp(firebaseConfig);

let userPhotoRaw = "";
let selectedCloth = null;

const clothesCatalog = [
    { id: 1, name: "Premium Red Luxury Native", img: "senator_red.jpg", price: "₦25k" },
    { id: 2, name: "Blue Ankara Suite", img: "ankara_blue.jpg", price: "₦22k" }
];

export function executeSearch() {
    const results = document.getElementById('ai-results');
    results.style.display = 'grid';
    results.innerHTML = clothesCatalog.map(item => `
        <div class="card" onclick="window.promptShowroomChoice(${item.id})" style="background:#111; padding:15px; border-radius:15px; cursor:pointer; border:1px solid #222; text-align:center;">
            <img src="/images/${item.img}" style="width:100%; border-radius:10px; height:200px; object-fit:cover;">
            <h3 style="color:white; margin:10px 0;">${item.name}</h3>
            <p style="color:#e60023; font-weight:800; margin:0;">${item.price}</p>
        </div>`).join('');
}

export function promptShowroomChoice(id) {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
}

export function handleUserFitUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhotoRaw = event.target.result.split(',')[1];
        startVertexModeling();
    };
    reader.readAsDataURL(file);
}

export async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `
        <div style="color:white; text-align:center; padding-top:100px; background:#000; height:100vh;">
            <div class="spinner-ring"></div>
            <h2 style="margin-top:20px;">PULSE TESTING SERVER...</h2>
            <p>Wait for the server to reply</p>
        </div>`;

    try {
        const response = await fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                jobId: "test_" + Date.now(), 
                userImage: userPhotoRaw 
            })
        });

        // This is where the 'Unexpected token I' usually happens
        const text = await response.text(); 
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("Server sent non-JSON response:", text);
            throw new Error("Server sent an error page instead of data.");
        }

        if (result.success) {
            displayFinalAnkara(`data:image/jpeg;base64,${result.image}`);
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        alert("PULSE FAILED: " + e.message);
    }
}

export function displayFinalAnkara(src) {
    document.getElementById('video-main-container').innerHTML = `
        <div style="text-align:center; padding:20px; background:#000; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;">
            <h2 style="color:#2ecc71; font-weight:900;">SERVER ALIVE!</h2>
            <p style="color:#888;">The backend received your photo successfully.</p>
            <img src="${src}" style="max-width:80%; border-radius:15px; border:2px solid #2ecc71; margin:20px 0;">
            <button onclick="location.reload()" style="padding:15px 40px; background:#e60023; color:white; border:none; border-radius:50px; font-weight:800;">RESTART</button>
        </div>`;
}

window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;