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

async function getBase64FromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

export function executeSearch() {
    const results = document.getElementById('ai-results');
    results.style.display = 'grid';
    results.innerHTML = clothesCatalog.map(item => `
        <div class="card" onclick="window.promptShowroomChoice(${item.id})" style="background:#111; padding:15px; border-radius:15px; cursor:pointer; border:1px solid #222; text-align:center;">
            <img src="/images/${item.img}" style="width:100%; border-radius:10px; height:200px; object-fit:cover;">
            <h3 style="color:white; margin:10px 0;">${item.name}</h3>
            <p style="color:#e60023; font-weight:800;">${item.price}</p>
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

async function startVertexModeling() {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('video-experience-modal').style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    container.innerHTML = `<div style="text-align:center; padding-top:100px; color:white;">
        <div class="spinner-ring"></div>
        <h2>AI IS STITCHING...</h2>
        <p>This takes about 30 seconds</p>
    </div>`;

    try {
        const clothB64 = await getBase64FromUrl(`/images/${selectedCloth.img}`);
        
        const response = await fetch('/.netlify/functions/process-vto-background', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhotoRaw, clothImage: clothB64 })
        });

        const result = await response.json();

        if (result.success) {
            displayFinalAnkara(`data:image/jpeg;base64,${result.image}`);
        } else {
            alert("AI Error: " + result.error);
            location.reload();
        }
    } catch (e) {
        alert("System Error: " + e.message);
        location.reload();
    }
}

function displayFinalAnkara(src) {
    document.getElementById('video-main-container').innerHTML = `
        <div style="text-align:center; background:#000; height:100vh; padding:20px;">
            <h2 style="color:#e60023;">YOUR NEW LOOK</h2>
            <img src="${src}" style="max-width:90%; border-radius:15px; border:2px solid #e60023;">
            <button onclick="location.reload()" style="display:block; margin:20px auto; padding:15px 40px; background:#e60023; color:white; border:none; border-radius:50px; font-weight:800;">RESTART</button>
        </div>`;
}

window.executeSearch = executeSearch;
window.promptShowroomChoice = promptShowroomChoice;
window.handleUserFitUpload = handleUserFitUpload;