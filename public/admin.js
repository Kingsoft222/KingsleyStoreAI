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
const db = getDatabase(app); 
const storage = getStorage(app);

const MASTER_EMAIL = "kman39980@gmail.com";
let activeStoreId = "", pendingBase64Image = null, pendingProductBase64 = null; 

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === MASTER_EMAIL) {
            const mBtn = document.getElementById('master-btn');
            if(mBtn) mBtn.style.display = 'block';
        }
        const snap = await get(dbRef(db, `users/${user.uid}`));
        if (snap.exists()) {
            activeStoreId = snap.val().storeId;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            loadDashboardData();
        } else { document.getElementById('onboarding-section').style.display = 'block'; }
    } else { 
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
    }
});

async function loadDashboardData() {
    const snap = await get(dbRef(db, `stores/${activeStoreId}`));
    const data = snap.val();
    if (data) {
        document.getElementById('admin-store-name').value = data.storeName || "";
        document.getElementById('admin-phone').value = data.phone || "";
        document.getElementById('admin-search-hint').value = data.searchHint || "";
        
        // Restore Greetings Settings View
        if (document.getElementById('admin-greetings')) {
            document.getElementById('admin-greetings').value = (data.customGreetings || []).join(', ');
        }
        if (document.getElementById('greetings-toggle')) {
            document.getElementById('greetings-toggle').checked = data.greetingsEnabled !== false;
        }

        const imgP = document.getElementById('admin-img-preview');
        const rmBtn = document.getElementById('remove-pic-btn');
        if (data.profileImage && imgP) { 
            imgP.src = data.profileImage; 
            imgP.style.display = "block"; 
            if(rmBtn) rmBtn.style.display = 'inline-block';
        } else if (imgP) {
            imgP.style.display = "none";
            if(rmBtn) rmBtn.style.display = 'none';
        }

        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }

        renderInventoryList(data.catalog || {});
    }
}

// LOGOUT: Now fully functional
window.logoutAdmin = () => {
    if(!confirm("Are you sure you want to logout?")) return;
    signOut(auth).then(() => {
        window.location.reload();
    }).catch(() => showToast("Error logging out."));
};

// REMOVE PROFILE PHOTO: Surgical removal from DB and UI
window.removeAdminImage = async () => {
    if(!confirm("Are you sure you want to remove your profile photo?")) return;
    try {
        await update(dbRef(db, `stores/${activeStoreId}`), { profileImage: null });
        document.getElementById('admin-img-preview').style.display = 'none';
        document.getElementById('remove-pic-btn').style.display = 'none';
        showToast("Profile Photo Removed");
    } catch (e) { showToast("Failed to remove photo"); }
};

// SWIFT UPLOAD: Clears Name, Price, Tags, and Image Preview on success
window.uploadNewProduct = async () => {
    const nameInput = document.getElementById('prod-name');
    const priceInput = document.getElementById('prod-price');
    const tagsInput = document.getElementById('prod-tags');
    const imgPreview = document.getElementById('prod-img-preview');
    const fileInput = document.getElementById('prod-pic-upload');
    const btn = document.getElementById('upload-prod-btn');

    if (!nameInput.value || !priceInput.value || !pendingProductBase64) return alert("Fill Name, Price & Image!");
    btn.innerText = "Adding...";

    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`, sRef = storageRef(storage, path);
        await uploadString(sRef, pendingProductBase64, 'data_url');
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameInput.value, 
            price: Number(priceInput.value),
            cat: document.getElementById('prod-brand').value,
            tags: tagsInput.value || "",
            imgUrl: url, 
            storagePath: path 
        });
        
        nameInput.value = ""; priceInput.value = ""; tagsInput.value = "";
        if(fileInput) fileInput.value = "";
        if(imgPreview) { imgPreview.style.display = "none"; imgPreview.src = ""; }
        pendingProductBase64 = null;

        showToast("Product Added Successfully!");
        loadDashboardData();
    } catch (e) { alert("Upload Failed."); }
    btn.innerText = "Add Item";
};

// BUSINESS REPORTS: Instant Download Triggers
window.downloadInventory = () => {
    showToast("Downloading Inventory PDF...");
    // Integration for your PDF library (jspdf/autotable) goes here
};

window.downloadOrders = () => {
    showToast("Downloading Orders PDF...");
    // Integration for your PDF library (jspdf/autotable) goes here
};

window.handleAdminImage = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingBase64Image = ev.target.result;
        const p = document.getElementById('admin-img-preview');
        p.src = ev.target.result; p.style.display = 'block';
        const rmBtn = document.getElementById('remove-pic-btn');
        if(rmBtn) rmBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.handleProductImagePreview = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingProductBase64 = ev.target.result;
        const p = document.getElementById('prod-img-preview');
        if(p) { p.src = ev.target.result; p.style.display = 'block'; }
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.saveStoreSettings = async () => {
    const btn = document.getElementById('save-btn');
    if(btn) btn.innerText = "Saving...";
    const updateData = {
        storeName: document.getElementById('admin-store-name').value,
        phone: document.getElementById('admin-phone').value,
        searchHint: document.getElementById('admin-search-hint').value,
        greetingsEnabled: document.getElementById('greetings-toggle').checked,
        customGreetings: document.getElementById('admin-greetings').value.split(',').map(g => g.trim())
    };
    if(pendingBase64Image) {
        const ref = storageRef(storage, `profiles/${activeStoreId}.jpg`);
        await uploadString(ref, pendingBase64Image, 'data_url');
        updateData.profileImage = await getDownloadURL(ref);
        pendingBase64Image = null;
    }
    await update(dbRef(db, `stores/${activeStoreId}`), updateData);
    if(btn) btn.innerText = "Save Settings";
    showToast("Settings Saved!");
};

function renderInventoryList(catalog) {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = Object.keys(catalog).map(k => `
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
    if (!confirm("Delete this product?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    if(path) try { await deleteObject(storageRef(storage, path)); } catch(e){}
    loadDashboardData();
};

window.toggleMasterVault = async () => {
    const section = document.getElementById('master-vault-section');
    if(!section) return;
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    const snap = await get(dbRef(db, 'stores'));
    const allStores = snap.val() || {};
    document.getElementById('vault-body').innerHTML = Object.keys(allStores).map(sid => `
        <tr><td>${sid}</td><td>${allStores[sid].storeName || 'N/A'}</td><td>${allStores[sid].phone || 'N/A'}</td></tr>
    `).join('');
};

window.loginWithGoogle = () => signInWithPopup(auth, provider);
function showToast(m) { const t = document.getElementById('status-toast'); if(t) { t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); } }