import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, update, push, remove, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAhzPRw3Gw4nN1DlIxDa1KszH69I4bcHPE",
    authDomain: "kingsleystoreai.firebaseapp.com", 
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e",
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
            if(mBtn) { mBtn.style.display = 'block'; mBtn.removeAttribute('disabled'); }
        }
        const snap = await get(dbRef(db, `users/${user.uid}`));
        if (snap.exists()) {
            activeStoreId = snap.val().storeId;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            loadDashboardData();
        }
    } else { 
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
    }
});

// MASTER VAULT WITH RESET
window.toggleMasterVault = async () => {
    const vaultSection = document.getElementById('master-vault-section');
    if (!vaultSection) return;
    const isHidden = vaultSection.style.display === 'none';
    if (isHidden) {
        vaultSection.style.display = 'block';
        showToast("Accessing Global Analytics...");
        const snap = await get(dbRef(db, 'stores'));
        const stores = snap.val() || {};
        const body = document.getElementById('vault-body');
        if(body) {
            body.innerHTML = Object.entries(stores).map(([id, s]) => `
                <tr>
                    <td>${id}</td>
                    <td>${s.storeName || 'N/A'}</td>
                    <td style="color:#25D366; font-weight:bold;">${s.analytics?.whatsappClicks || 0}</td>
                    <td><button onclick="window.resetClicks('${id}')" style="background:#444; color:white; border:none; padding:5px; cursor:pointer; border-radius:4px;">Reset</button></td>
                </tr>`).join('');
        }
    } else { vaultSection.style.display = 'none'; }
};

window.resetClicks = async (id) => {
    if(!confirm(`Reset clicks for ${id}?`)) return;
    await update(dbRef(db, `stores/${id}/analytics`), { whatsappClicks: 0 });
    window.toggleMasterVault(); 
};

async function loadDashboardData() {
    const snap = await get(dbRef(db, `stores/${activeStoreId}`));
    const data = snap.val();
    if (data) {
        document.getElementById('admin-store-name').value = data.storeName || "";
        document.getElementById('admin-phone').value = data.phone || "";
        document.getElementById('admin-search-hint').value = data.searchHint || "";
        
        // INDEPENDENT LABELS CONTROLS
        document.getElementById('admin-label-1').value = data.label1 || "Ladies Trouser";
        document.getElementById('admin-label-2').value = data.label2 || "Dinner Wears";

        const greetText = document.getElementById('admin-greetings');
        if (greetText) greetText.value = (data.customGreetings || []).join(', ');
        const greetToggle = document.getElementById('greetings-toggle');
        if (greetToggle) greetToggle.checked = data.greetingsEnabled !== false;

        // PHOTO AND REMOVE BUTTON LOGIC
        const imgP = document.getElementById('admin-img-preview');
        const rmBtn = document.getElementById('remove-pic-btn');
        if (data.profileImage) { 
            imgP.src = data.profileImage; imgP.style.display = "block"; 
            if(rmBtn) rmBtn.style.display = "inline-block";
        } else {
            imgP.style.display = "none";
            if(rmBtn) rmBtn.style.display = "none";
        }
        renderInventoryList(data.catalog || {});
    }
}

window.removeAdminImage = async () => {
    if(!confirm("Remove profile photo?")) return;
    await update(dbRef(db, `stores/${activeStoreId}`), { profileImage: null });
    loadDashboardData();
    showToast("Photo Removed");
};

window.saveStoreSettings = async () => {
    const btn = document.getElementById('save-btn');
    btn.innerText = "Saving...";
    const updateData = {
        storeName: document.getElementById('admin-store-name').value,
        phone: document.getElementById('admin-phone').value,
        searchHint: document.getElementById('admin-search-hint').value,
        label1: document.getElementById('admin-label-1').value,
        label2: document.getElementById('admin-label-2').value,
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
    btn.innerText = "Save Profile Settings"; 
    showToast("Saved!");
    loadDashboardData();
};

window.uploadNewProduct = async () => {
    const nameInput = document.getElementById('prod-name'), priceInput = document.getElementById('prod-price');
    const tagsInput = document.getElementById('prod-tags'), imgP = document.getElementById('prod-img-preview');
    const fileInput = document.getElementById('prod-pic-upload'), btn = document.getElementById('upload-prod-btn');

    if (!nameInput.value || !priceInput.value || !pendingProductBase64) return alert("Fill Name, Price & Image!");
    btn.innerText = "Adding...";
    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`, sRef = storageRef(storage, path);
        await uploadString(sRef, pendingProductBase64, 'data_url');
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameInput.value, price: Number(priceInput.value),
            cat: document.getElementById('prod-brand').value,
            tags: tagsInput.value || "", imgUrl: url, storagePath: path 
        });
        
        // --- SWIFT CLEAR SUCCESS ---
        nameInput.value = ""; priceInput.value = ""; tagsInput.value = "";
        if(fileInput) fileInput.value = "";
        imgP.style.display = "none";
        pendingProductBase64 = null;
        
        showToast("Product Added!"); loadDashboardData();
    } catch (e) { alert("Error adding product."); }
    btn.innerText = "Add Item to Store";
};

// REPORTS & UTILS
window.downloadInventory = async () => {
    const snap = await get(dbRef(db, `stores/${activeStoreId}/catalog`));
    const data = snap.val() || {};
    let csv = "Name,Price\n";
    Object.values(data).forEach(i => csv += `"${i.name}","${i.price}"\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Inventory.csv"; a.click();
};

window.downloadOrders = async () => {
    const snap = await get(dbRef(db, `orders/${activeStoreId}`));
    const data = snap.val() || {};
    let csv = "OrderID,Customer,Total\n";
    Object.entries(data).forEach(([id, o]) => csv += `"${id}","${o.customerName}","${o.total}"\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Orders.csv"; a.click();
};

window.handleAdminImage = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingBase64Image = ev.target.result;
        document.getElementById('admin-img-preview').src = ev.target.result;
        document.getElementById('admin-img-preview').style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.handleProductImagePreview = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingProductBase64 = ev.target.result;
        document.getElementById('prod-img-preview').src = ev.target.result;
        document.getElementById('prod-img-preview').style.display = 'block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

function renderInventoryList(catalog) {
    document.getElementById('inventory-list').innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item">
            <img src="${catalog[k].imgUrl}">
            <div class="inventory-item-details"><h4>${catalog[k].name}</h4><p>₦${catalog[k].price.toLocaleString()}</p></div>
            <button onclick="window.deleteProduct('${k}', '${catalog[k].storagePath}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

window.deleteProduct = async (k, path) => {
    if (!confirm("Delete product?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    loadDashboardData();
};

window.logoutAdmin = () => signOut(auth).then(() => window.location.reload());
window.loginWithGoogle = () => signInWithPopup(auth, provider);
function showToast(m) { const t = document.getElementById('status-toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }