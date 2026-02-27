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

const MASTER_EMAIL = "kman39980@gmail.com";
let currentGoogleUser = null, activeStoreId = "", pendingBase64Image = null, pendingProductBase64 = null; 
let currentStoreOrders = {};
let currentStoreInventory = {};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentGoogleUser = user;
        document.getElementById('login-section').style.display = 'none';
        if (user.email === MASTER_EMAIL) document.getElementById('master-btn').style.display = 'block';
        const snap = await get(dbRef(db, `users/${user.uid}`));
        if (snap.exists()) {
            activeStoreId = snap.val().storeId;
            document.getElementById('onboarding-section').style.display = 'none';
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
        document.getElementById('admin-search-hint').value = data.searchHint || "Search Senator or Ankara";
        document.getElementById('admin-greetings-toggle').checked = data.greetingsEnabled !== false;
        document.getElementById('admin-custom-greetings').value = (data.customGreetings || []).join('\n');
        document.getElementById('admin-quick-searches').value = (data.quickSearches || []).join(', ');
        
        currentStoreOrders = data.orders || {};
        currentStoreInventory = data.catalog || {};

        const imgP = document.getElementById('admin-img-preview');
        if (data.profileImage) { imgP.src = data.profileImage; imgP.style.display = "block"; document.getElementById('remove-pic-btn').style.display = "inline-block"; }
        
        const link = `${window.location.origin}/?store=${activeStoreId}`;
        document.getElementById('my-store-link').href = link; document.getElementById('my-store-link').innerText = link;
        renderInventoryList(currentStoreInventory);
    }
}

// PDF GENERATION LOGIC
window.downloadOrdersPDF = () => {
    const bizName = document.getElementById('admin-store-name').value || activeStoreId;
    let printWindow = window.open('', '_blank');
    
    let ordersHtml = Object.keys(currentStoreOrders).reverse().map(k => {
        const o = currentStoreOrders[k];
        return `<tr><td>${new Date(o.timestamp).toLocaleDateString()}</td><td>${o.item}</td><td>₦${o.price.toLocaleString()}</td></tr>`;
    }).join('');

    let inventoryHtml = Object.keys(currentStoreInventory).map(k => {
        const i = currentStoreInventory[k];
        return `<tr><td>${i.name}</td><td>${i.cat}</td><td>₦${i.price.toLocaleString()}</td></tr>`;
    }).join('');

    printWindow.document.write(`
        <html><head><title>${bizName} Report</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #e60023; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style></head>
        <body>
            <h1>${bizName} - Business Report</h1>
            <h3>Sales Orders</h3>
            <table><thead><tr><th>Date</th><th>Item</th><th>Price</th></tr></thead><tbody>${ordersHtml || '<tr><td colspan="3">No orders found</td></tr>'}</tbody></table>
            <h3>Current Inventory</h3>
            <table><thead><tr><th>Item Name</th><th>Category</th><th>Price</th></tr></thead><tbody>${inventoryHtml || '<tr><td colspan="3">No inventory found</td></tr>'}</tbody></table>
            <script>window.print();</script>
        </body></html>
    `);
    printWindow.document.close();
};

window.saveStoreSettings = async () => {
    const btn = document.getElementById('save-btn'); btn.innerText = "Saving...";
    const updateData = {
        storeName: document.getElementById('admin-store-name').value,
        phone: document.getElementById('admin-phone').value,
        searchHint: document.getElementById('admin-search-hint').value,
        greetingsEnabled: document.getElementById('admin-greetings-toggle').checked,
        customGreetings: document.getElementById('admin-custom-greetings').value.split('\n').filter(l => l.trim()),
        quickSearches: document.getElementById('admin-quick-searches').value.split(',').map(t => t.trim())
    };
    if (pendingBase64Image) {
        const ref = storageRef(storage, `profiles/${activeStoreId}.jpg`);
        await uploadString(ref, pendingBase64Image, 'data_url');
        updateData.profileImage = await getDownloadURL(ref);
    }
    await update(dbRef(db, `stores/${activeStoreId}`), updateData);
    btn.innerText = "Save Profile Settings";
    showToast("Saved!");
};

window.uploadNewProduct = async () => {
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const cat = document.getElementById('prod-brand').value;
    const tags = document.getElementById('prod-tags').value;
    if (!name || !price || !pendingProductBase64) return alert("Fill all fields!");
    const btn = document.getElementById('upload-prod-btn');
    btn.innerText = "Uploading...";
    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`, sRef = storageRef(storage, path);
        await uploadString(sRef, pendingProductBase64, 'data_url');
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { name, cat, price: Number(price), tags, imgUrl: url, storagePath: path });
        showToast("Item added!"); loadDashboardData();
    } catch (e) { alert("Failed."); }
    btn.innerText = "Add Item";
};

window.handleAdminImage = (e) => {
    const reader = new FileReader(); reader.onload = (ev) => {
        pendingBase64Image = ev.target.result;
        const p = document.getElementById('admin-img-preview'); p.src = pendingBase64Image; p.style.display = "block";
    }; reader.readAsDataURL(e.target.files[0]);
};

window.handleProductImagePreview = (e) => {
    const reader = new FileReader(); reader.onload = (ev) => {
        pendingProductBase64 = ev.target.result;
        const p = document.getElementById('prod-img-preview'); p.src = pendingProductBase64; p.style.display = "block";
    }; reader.readAsDataURL(e.target.files[0]);
};

function renderInventoryList(catalog) {
    const div = document.getElementById('inventory-list');
    const keys = Object.keys(catalog);
    if (keys.length === 0) { div.innerHTML = "<p>No inventory.</p>"; return; }
    div.innerHTML = keys.map(k => {
        const i = catalog[k];
        return `<div class="inventory-item"><img src="${i.imgUrl}">
            <div class="inventory-item-details"><h4>${i.name}</h4><p>₦${i.price.toLocaleString()}</p></div>
            <button onclick="window.deleteProduct('${k}', '${i.storagePath}')" style="color:red; background:none; border:none;"><i class="fas fa-trash"></i></button>
        </div>`;
    }).join('');
}

window.deleteProduct = async (k, path) => {
    if (!confirm("Delete?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    if(path) try { await deleteObject(storageRef(storage, path)); } catch(e){}
    loadDashboardData();
};

window.loginWithGoogle = () => signInWithPopup(auth, provider);
window.logoutAdmin = () => signOut(auth);
window.toggleGreetingsBox = () => {
    const checked = document.getElementById('admin-greetings-toggle').checked;
    document.getElementById('custom-greetings-container').style.display = checked ? 'block' : 'none';
};
function showToast(m) { const t = document.getElementById('status-toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }