import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, update, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAhzPRw3Gw4nN1DlIxDa1KszH69I4bcHPE",
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e",
    measurementId: "G-PJZD5D3NF6",
    databaseURL: "https://kingsleystoreai-default-rtdb.firebaseio.com" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app, "https://kingsleystoreai-default-rtdb.firebaseio.com"); 
const storage = getStorage(app);

let currentGoogleUser = null, activeStoreId = "", pendingProductBase64 = null; 

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentGoogleUser = user;
        const userMapSnapshot = await get(dbRef(db, `users/${user.uid}`));
        if (userMapSnapshot.exists()) {
            activeStoreId = userMapSnapshot.val().storeId;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            loadDashboardData();
        } else { document.getElementById('onboarding-section').style.display = 'block'; }
    } else { document.getElementById('login-section').style.display = 'block'; }
});

async function loadDashboardData() {
    const snap = await get(dbRef(db, `stores/${activeStoreId}`));
    const data = snap.val();
    if (data) {
        document.getElementById('admin-store-name').value = data.storeName || "";
        document.getElementById('admin-phone').value = data.phone || "";
        document.getElementById('admin-search-hint').value = data.searchHint || "";
        
        // Restore Store Link
        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }

        // Restore Profile Pic
        const imgP = document.getElementById('admin-img-preview');
        if (data.profileImage && imgP) { 
            imgP.src = data.profileImage; 
            imgP.style.display = "block"; 
        }
        renderInventoryList(data.catalog || {});
    }
}

// SWIFT UPLOAD SYSTEM: Keeps image visible for professional flow
window.uploadNewProduct = async () => {
    const nameInput = document.getElementById('prod-name');
    const priceInput = document.getElementById('prod-price');
    const btn = document.getElementById('upload-prod-btn');

    if (!nameInput.value || !priceInput.value || !pendingProductBase64) return alert("Fill Name, Price & Image!");
    btn.innerText = "Adding...";

    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`, sRef = storageRef(storage, path);
        await uploadString(sRef, pendingProductBase64, 'data_url');
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameInput.value, 
            cat: document.getElementById('prod-brand').value, 
            price: Number(priceInput.value), 
            imgUrl: url, 
            storagePath: path 
        });
        
        // PROFESSIONAL RESET: Clear text inputs but KEEP image on screen
        nameInput.value = "";
        priceInput.value = "";
        showToast("Added! Ready for next name/price.");
        loadDashboardData();
    } catch (e) { alert("Upload failed."); }
    btn.innerText = "Add Item";
};

// ... Rest of admin functions (deleteProduct, saveSettings, handleProductImagePreview) ...
window.handleProductImagePreview = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingProductBase64 = ev.target.result;
        const p = document.getElementById('prod-img-preview');
        p.src = ev.target.result; p.style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};
window.loginWithGoogle = () => signInWithPopup(auth, provider);
window.logoutAdmin = () => signOut(auth);
function showToast(m) { const t = document.getElementById('status-toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }