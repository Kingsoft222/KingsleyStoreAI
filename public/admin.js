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

let currentGoogleUser = null, activeStoreId = "", pendingBase64Image = null, pendingProductBase64 = null; 

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
        
        // RESTORE PROFILE PIC VIEW
        const imgP = document.getElementById('admin-img-preview');
        if (data.profileImage) { 
            imgP.src = data.profileImage; 
            imgP.style.display = "block"; 
            document.getElementById('remove-pic-btn').style.display = "inline-block";
        }
        renderInventoryList(data.catalog || {});
    }
}

// SWIFT UPLOAD SYSTEM
window.uploadNewProduct = async () => {
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const cat = document.getElementById('prod-brand').value;
    const btn = document.getElementById('upload-prod-btn');

    if (!name || !price || !pendingProductBase64) return alert("Fill all fields!");
    btn.innerText = "Adding...";

    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`, sRef = storageRef(storage, path);
        await uploadString(sRef, pendingProductBase64, 'data_url');
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { name, cat, price: Number(price), imgUrl: url, storagePath: path });
        
        // RESET FIELDS FOR SWIFT NEXT UPLOAD
        document.getElementById('prod-name').value = "";
        document.getElementById('prod-price').value = "";
        showToast("Item Added!");
        loadDashboardData();
    } catch (e) { alert("Failed."); }
    btn.innerText = "Add Item";
};

window.handleProductImagePreview = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingProductBase64 = ev.target.result;
        const p = document.getElementById('prod-img-preview');
        p.src = ev.target.result; p.style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveStoreSettings = async () => {
    const btn = document.getElementById('save-btn'); btn.innerText = "Saving...";
    const updateData = {
        storeName: document.getElementById('admin-store-name').value,
        phone: document.getElementById('admin-phone').value,
        searchHint: document.getElementById('admin-search-hint').value
    };
    if (pendingBase64Image) {
        const ref = storageRef(storage, `profiles/${activeStoreId}.jpg`);
        await uploadString(ref, pendingBase64Image, 'data_url');
        updateData.profileImage = await getDownloadURL(ref);
    }
    await update(dbRef(db, `stores/${activeStoreId}`), updateData);
    btn.innerText = "Save Settings";
    showToast("Profile Updated!");
};

window.handleAdminImage = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingBase64Image = ev.target.result;
        const p = document.getElementById('admin-img-preview');
        p.src = ev.target.result; p.style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

function renderInventoryList(catalog) {
    const div = document.getElementById('inventory-list');
    div.innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item">
            <img src="${catalog[k].imgUrl}">
            <div class="inventory-item-details"><h4>${catalog[k].name}</h4><p>₦${catalog[k].price.toLocaleString()}</p></div>
            <button onclick="window.deleteProduct('${k}', '${catalog[k].storagePath}')" style="color:red; background:none; border:none;"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

window.loginWithGoogle = () => signInWithPopup(auth, provider);
window.logoutAdmin = () => signOut(auth);
function showToast(m) { const t = document.getElementById('status-toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }