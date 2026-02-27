import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, update, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
const db = getDatabase(app); 
const storage = getStorage(app);

const MASTER_EMAIL = "kman39980@gmail.com";
let currentGoogleUser = null, activeStoreId = "", pendingBase64Image = null, pendingProductBase64 = null; 

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentGoogleUser = user;
        const mBtn = document.getElementById('master-btn');
        if (user.email === MASTER_EMAIL && mBtn) mBtn.style.display = 'block';

        const snap = await get(dbRef(db, `users/${user.uid}`));
        if (snap.exists()) {
            activeStoreId = snap.val().storeId;
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
        
        // --- RESTORE PROFILE PIC FOR ALL ---
        const imgP = document.getElementById('admin-img-preview');
        if (data.profileImage && imgP) { imgP.src = data.profileImage; imgP.style.display = "block"; }
        
        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }

        renderInventoryList(data.catalog || {});
    }
}

window.uploadNewProduct = async () => {
    const nameI = document.getElementById('prod-name');
    const priceI = document.getElementById('prod-price');
    const tagsI = document.getElementById('prod-tags');
    const fileI = document.getElementById('prod-pic-upload');
    const btn = document.getElementById('upload-prod-btn');

    if (!nameI.value || !priceI.value || !pendingProductBase64) return alert("Fill all fields!");
    btn.innerText = "Adding...";

    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`, sRef = storageRef(storage, path);
        await uploadString(sRef, pendingProductBase64, 'data_url');
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameI.value, 
            cat: document.getElementById('prod-brand').value, 
            price: Number(priceI.value), 
            tags: tagsI.value,
            imgUrl: url, 
            storagePath: path 
        });
        
        // --- SWIFT CLEAR EVERYTHING ---
        nameI.value = ""; priceI.value = ""; tagsI.value = ""; fileI.value = "";
        pendingProductBase64 = null;
        document.getElementById('prod-img-preview').style.display = 'none';
        
        showToast("Added!"); loadDashboardData();
    } catch (e) { alert("Error."); }
    btn.innerText = "Add Item";
};

function renderInventoryList(catalog) {
    const div = document.getElementById('inventory-list');
    div.innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item">
            <img src="${catalog[k].imgUrl}">
            <div class="inventory-item-details">
                <h4>${catalog[k].name}</h4>
                <p>₦${catalog[k].price.toLocaleString()}</p>
            </div>
            <button onclick="window.deleteProduct('${k}', '${catalog[k].storagePath}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

window.deleteProduct = async (k, path) => {
    if (!confirm("Delete?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    if(path) try { await deleteObject(storageRef(storage, path)); } catch(e){}
    loadDashboardData();
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

window.toggleMasterVault = () => {
    const section = document.getElementById('master-vault-section');
    if(section) section.style.display = section.style.display === 'block' ? 'none' : 'block';
};

window.loginWithGoogle = () => signInWithPopup(auth, provider);
function showToast(m) { const t = document.getElementById('status-toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }