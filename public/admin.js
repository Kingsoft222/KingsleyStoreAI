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
            if(mBtn) {
                mBtn.style.display = 'block';
                mBtn.removeAttribute('disabled');
            }
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

// --- MASTER VAULT LOGIC (With Reset & Analytics) ---
window.toggleMasterVault = async () => {
    const vaultSection = document.getElementById('master-vault-section');
    if (vaultSection) {
        const isHidden = vaultSection.style.display === 'none';
        if (isHidden) {
            vaultSection.style.display = 'block';
            showToast("Master Vault Accessed");
            const snap = await get(dbRef(db, 'stores'));
            const stores = snap.val() || {};
            const body = document.getElementById('vault-body');
            if(body) {
                body.innerHTML = Object.entries(stores).map(([id, s]) => `
                    <tr>
                        <td>${id}</td>
                        <td>${s.storeName || 'Unnamed'}</td>
                        <td style="color:#25D366; font-weight:bold;">${s.analytics?.whatsappClicks || 0}</td>
                        <td><button onclick="window.resetStoreClicks('${id}')" style="background:#444; color:white; padding:4px 8px; font-size:10px; border-radius:4px; border:none; cursor:pointer;">Reset</button></td>
                    </tr>
                `).join('');
            }
        } else {
            vaultSection.style.display = 'none';
        }
    }
};

// --- RESET ANALYTICS FUNCTION ---
window.resetStoreClicks = async (storeId) => {
    if(!confirm(`Reset WhatsApp clicks for ${storeId}?`)) return;
    await update(dbRef(db, `stores/${storeId}/analytics`), { whatsappClicks: 0 });
    showToast("Analytics Reset!");
    window.toggleMasterVault(); // Refresh table
};

async function loadDashboardData() {
    const snap = await get(dbRef(db, `stores/${activeStoreId}`));
    const data = snap.val();
    if (data) {
        document.getElementById('admin-store-name').value = data.storeName || "";
        document.getElementById('admin-phone').value = data.phone || "";
        document.getElementById('admin-search-hint').value = data.searchHint || "";
        
        // --- DEDICATED LABELS LOAD ---
        if(document.getElementById('admin-label-1')) document.getElementById('admin-label-1').value = data.label1 || "Ladies Trouser";
        if(document.getElementById('admin-label-2')) document.getElementById('admin-label-2').value = data.label2 || "Dinner Wears";
        
        // Update the Visual Labels at the top of Admin Dashboard
        if(document.getElementById('display-label-1')) document.getElementById('display-label-1').innerText = data.label1 || "Ladies Trouser";
        if(document.getElementById('display-label-2')) document.getElementById('display-label-2').innerText = data.label2 || "Dinner Wears";

        const greetText = document.getElementById('admin-greetings');
        if (greetText) greetText.value = (data.customGreetings || []).join(', ');
        
        const imgP = document.getElementById('admin-img-preview');
        if (data.profileImage) { 
            imgP.src = data.profileImage; 
            imgP.style.display = "block"; 
        }

        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }

        renderInventoryList(data.catalog || {});
    }
}

// --- BUSINESS REPORTS ---
window.downloadInventory = async () => {
    const choice = prompt("Enter 1 for PDF, 2 for CSV", "1");
    if (!choice) return;
    showToast("Generating Report...");
    const snap = await get(dbRef(db, `stores/${activeStoreId}/catalog`));
    const data = snap.val();
    if (!data) return alert("Inventory empty.");

    let content = "";
    if (choice === "1") {
        content = `INVENTORY REPORT: ${activeStoreId}\n\n`;
        Object.values(data).forEach(item => {
            content += `${item.name}: ₦${item.price.toLocaleString()}\n----------\n`;
        });
        triggerDownload(new Blob([content], { type: 'application/pdf' }), `Inventory.pdf`);
    } else {
        content = "Name,Price\n";
        Object.values(data).forEach(item => {
            content += `"${item.name}","${item.price}"\n`;
        });
        triggerDownload(new Blob([content], { type: 'text/csv' }), `Inventory.csv`);
    }
};

window.downloadOrders = async () => {
    const choice = prompt("Enter 1 for PDF, 2 for CSV", "1");
    if (!choice) return;
    showToast("Fetching Orders...");
    const snap = await get(dbRef(db, `orders/${activeStoreId}`));
    const data = snap.val() || {};
    let content = choice === "1" ? "ORDERS REPORT\n\n" : "OrderID,Customer,Total\n";
    Object.entries(data).forEach(([id, o]) => {
        content += choice === "1" ? `ID: ${id} | Customer: ${o.customerName}\n` : `"${id}","${o.customerName}","${o.total}"\n`;
    });
    triggerDownload(new Blob([content], { type: choice === "1" ? 'application/pdf' : 'text/csv' }), `Orders.${choice === "1" ? 'pdf' : 'csv'}`);
};

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    showToast("Download Complete!");
}

window.logoutAdmin = () => signOut(auth).then(() => window.location.reload());

window.saveStoreSettings = async () => {
    const btn = document.getElementById('save-btn');
    if(btn) btn.innerText = "Saving...";
    const updateData = {
        storeName: document.getElementById('admin-store-name').value,
        phone: document.getElementById('admin-phone').value,
        searchHint: document.getElementById('admin-search-hint').value,
        label1: document.getElementById('admin-label-1').value,
        label2: document.getElementById('admin-label-2').value,
        customGreetings: document.getElementById('admin-greetings').value.split(',').map(g => g.trim())
    };
    if(pendingBase64Image) {
        const ref = storageRef(storage, `profiles/${activeStoreId}.jpg`);
        await uploadString(ref, pendingBase64Image, 'data_url');
        updateData.profileImage = await getDownloadURL(ref);
        pendingBase64Image = null;
    }
    await update(dbRef(db, `stores/${activeStoreId}`), updateData);
    if(btn) btn.innerText = "Save Profile Settings";
    showToast("Settings Saved!");
    loadDashboardData();
};

window.uploadNewProduct = async () => {
    const nameInput = document.getElementById('prod-name'), priceInput = document.getElementById('prod-price');
    const btn = document.getElementById('upload-prod-btn');
    if (!nameInput.value || !priceInput.value || !pendingProductBase64) return alert("Fill Name, Price & Image!");
    btn.innerText = "Adding...";
    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`, sRef = storageRef(storage, path);
        await uploadString(sRef, pendingProductBase64, 'data_url');
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameInput.value, price: Number(priceInput.value),
            cat: document.getElementById('prod-brand').value,
            tags: document.getElementById('prod-tags').value || "", imgUrl: url, storagePath: path 
        });
        nameInput.value = ""; priceInput.value = ""; document.getElementById('prod-img-preview').style.display = "none";
        pendingProductBase64 = null;
        showToast("Product Added!"); loadDashboardData();
    } catch (e) { alert("Upload Failed."); }
    btn.innerText = "Add Item to Store";
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
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item">
            <img src="${catalog[k].imgUrl}">
            <div class="inventory-item-details"><h4>${catalog[k].name}</h4><p>₦${catalog[k].price.toLocaleString()}</p></div>
            <button onclick="window.deleteProduct('${k}', '${catalog[k].storagePath}')" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

window.deleteProduct = async (k, path) => {
    if (!confirm("Delete product?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    if(path) try { await deleteObject(storageRef(storage, path)); } catch(e){}
    loadDashboardData();
};

window.loginWithGoogle = () => signInWithPopup(auth, provider);
function showToast(m) { const t = document.getElementById('status-toast'); if(t) { t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); } }