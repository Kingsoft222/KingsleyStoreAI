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

// 👉 MASTER KEY: Your specific email
const MASTER_EMAIL = "kman39980@gmail.com";

let currentGoogleUser = null;
let activeStoreId = ""; 
let pendingBase64Image = null; 
let pendingProductBase64 = null; 

const defaultGreetings = [
    "Nne, what are you looking for today?", 
    "My guy, what are you looking for today?", 
    "Classic Man, what are you looking for today?", 
    "Chief, looking for premium native?", 
    "Boss, let's find your style!", 
    "Classic Babe, what are you looking for today?", 
    "Baddie, let's find your style!"
];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentGoogleUser = user;
        document.getElementById('login-section').style.display = 'none';

        // 🔓 SECRET DOOR: Reveal Vault button only for you
        if (user.email === MASTER_EMAIL) {
            const masterBtn = document.getElementById('master-btn');
            if(masterBtn) masterBtn.style.display = 'flex';
        }
        
        const userMapSnapshot = await get(dbRef(db, `users/${user.uid}`));
        if (userMapSnapshot.exists()) {
            activeStoreId = userMapSnapshot.val().storeId;
            document.getElementById('onboarding-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            loadDashboardData();
        } else {
            document.getElementById('onboarding-section').style.display = 'block';
            document.getElementById('dashboard-section').style.display = 'none';
        }
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('onboarding-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'none';
        currentGoogleUser = null;
        activeStoreId = "";
    }
});

// --- MASTER VAULT LOGIC ---
window.toggleMasterVault = async () => {
    const section = document.getElementById('master-vault-section');
    if (section.style.display === 'block') {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    const snapshot = await get(dbRef(db, 'global_orders'));
    const orders = snapshot.val() || {};
    const tbody = document.getElementById('vault-body');
    
    let totalOrders = 0;
    let totalGmv = 0;
    tbody.innerHTML = "";

    Object.keys(orders).reverse().forEach(key => {
        const o = orders[key];
        totalOrders++;
        totalGmv += Number(o.price);
        tbody.innerHTML += `<tr><td>@${o.storeId || 'N/A'}</td><td>${o.item}</td><td>₦${o.price.toLocaleString()}</td></tr>`;
    });

    document.getElementById('v-orders').innerText = totalOrders;
    document.getElementById('v-gmv').innerText = "₦" + totalGmv.toLocaleString();
};

// --- VENDOR CORE LOGIC ---
window.loginWithGoogle = async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { alert("Login Failed: " + error.message); }
};

window.logoutAdmin = () => signOut(auth);

window.completeStoreSetup = async () => {
    const usernameInput = document.getElementById('setup-username').value.toLowerCase().trim().replace(/\s+/g, '');
    const bizName = document.getElementById('setup-bizname').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    const btn = document.getElementById('setup-btn');

    if (!usernameInput || !bizName || !phone) return alert("Please fill all fields.");
    btn.innerText = "Checking availability...";
    btn.disabled = true;

    try {
        const storeCheck = await get(dbRef(db, `stores/${usernameInput}`));
        if (storeCheck.exists()) {
            btn.innerText = "Create Store";
            btn.disabled = false;
            return alert("Username taken.");
        }
        await set(dbRef(db, `users/${currentGoogleUser.uid}`), { storeId: usernameInput });
        await set(dbRef(db, `stores/${usernameInput}`), {
            storeName: bizName,
            phone: phone,
            greetingsEnabled: true,
            customGreetings: defaultGreetings,
            ownerEmail: currentGoogleUser.email
        });
        activeStoreId = usernameInput;
        document.getElementById('onboarding-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        loadDashboardData();
    } catch (error) { alert("Failed to create store."); }
};

async function loadDashboardData() {
    try {
        const snapshot = await get(dbRef(db, `stores/${activeStoreId}`));
        const data = snapshot.val();
        if (data) {
            document.getElementById('admin-store-name').value = data.storeName || "";
            document.getElementById('admin-phone').value = data.phone || "";
            document.getElementById('admin-greetings-toggle').checked = data.greetingsEnabled !== false;
            const loadedGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : defaultGreetings;
            document.getElementById('admin-custom-greetings').value = loadedGreetings.join('\n');
            window.toggleGreetingsBox(); 
            
            const imgPreview = document.getElementById('admin-img-preview');
            const removeBtn = document.getElementById('remove-pic-btn');
            if (data.profileImage) {
                imgPreview.src = data.profileImage;
                imgPreview.style.display = "block";
                removeBtn.style.display = "inline-block";
            }
            
            const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
            const linkEl = document.getElementById('my-store-link');
            if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }

            renderInventoryList(data.catalog || {});
            renderOrderHistory(data.orders || {});
        }
    } catch (e) { console.error(e); }
}

function renderOrderHistory(orders) {
    const listDiv = document.getElementById('order-history-list');
    const keys = Object.keys(orders).reverse();
    if (keys.length === 0) {
        listDiv.innerHTML = `<p style="text-align:center; color:#666;">Waiting for your first AI sale...</p>`;
        return;
    }
    listDiv.innerHTML = keys.map(key => {
        const o = orders[key];
        const date = new Date(o.timestamp).toLocaleDateString() + " " + new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return `<div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #333; font-size: 0.95rem;">${o.item}</h4>
            <div style="display: flex; justify-content: space-between; margin-top: 5px; align-items: center;">
                <span style="color: #e60023; font-weight: bold;">₦${o.price.toLocaleString()}</span>
                <span style="font-size: 0.8rem; color: #888;">${date}</span>
            </div>
        </div>`;
    }).join('');
}

window.toggleGreetingsBox = () => {
    const isChecked = document.getElementById('admin-greetings-toggle').checked;
    const box = document.getElementById('custom-greetings-container');
    if(box) box.style.display = isChecked ? 'block' : 'none';
};

window.handleAdminImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        pendingBase64Image = event.target.result;
        const imgPreview = document.getElementById('admin-img-preview');
        imgPreview.src = pendingBase64Image;
        imgPreview.style.display = "block";
        document.getElementById('remove-pic-btn').style.display = "inline-block";
    };
    reader.readAsDataURL(file);
};

window.saveStoreSettings = async () => {
    if (!activeStoreId) return;
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    try {
        const greetingsEnabled = document.getElementById('admin-greetings-toggle').checked;
        const rawGreetings = document.getElementById('admin-custom-greetings').value;
        const customGreetingsArray = rawGreetings.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        let updateData = { 
            storeName: document.getElementById('admin-store-name').value, 
            phone: document.getElementById('admin-phone').value,
            greetingsEnabled: greetingsEnabled,
            customGreetings: customGreetingsArray 
        };

        if (pendingBase64Image) {
            const imageRef = storageRef(storage, `profiles/${activeStoreId}_profile.jpg`);
            await uploadString(imageRef, pendingBase64Image, 'data_url');
            updateData.profileImage = await getDownloadURL(imageRef);
            pendingBase64Image = null; 
        }

        await update(dbRef(db, `stores/${activeStoreId}`), updateData);
        showToast("Profile Saved!");
    } catch (error) { alert("Failed to save."); }

    saveBtn.innerText = "Save Profile Settings";
    saveBtn.disabled = false;
};

window.uploadNewProduct = async () => {
    if (!activeStoreId) return;
    const name = document.getElementById('prod-name').value.trim();
    const brand = document.getElementById('prod-brand').value;
    const price = document.getElementById('prod-price').value;
    const tags = document.getElementById('prod-tags').value.toLowerCase().trim();
    const btn = document.getElementById('upload-prod-btn');

    if (!name || !price || !pendingProductBase64) return alert("All fields required!");
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;
    btn.disabled = true;

    try {
        const fileId = Date.now();
        const imagePath = `inventory/${activeStoreId}/${fileId}.jpg`;
        const imageRef = storageRef(storage, imagePath);
        await uploadString(imageRef, pendingProductBase64, 'data_url');
        const imageUrl = await getDownloadURL(imageRef);

        const productData = { name, cat: brand, price: Number(price), tags, imgUrl: imageUrl, storagePath: imagePath };
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), productData);

        document.getElementById('prod-name').value = "";
        document.getElementById('prod-price').value = "";
        document.getElementById('prod-img-preview').style.display = "none";
        pendingProductBase64 = null;
        showToast("Item added!");
        loadDashboardData(); 
    } catch (e) { alert("Upload failed."); }
    btn.innerHTML = `<i class="fas fa-plus"></i> Add Item to Store`;
    btn.disabled = false;
};

window.handleProductImagePreview = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        pendingProductBase64 = event.target.result;
        const imgPreview = document.getElementById('prod-img-preview');
        imgPreview.src = pendingProductBase64;
        imgPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
};

function renderInventoryList(catalog) {
    const listDiv = document.getElementById('inventory-list');
    const keys = Object.keys(catalog);
    if (keys.length === 0) { listDiv.innerHTML = `<p style="text-align:center;">Empty Store.</p>`; return; }
    listDiv.innerHTML = keys.map(key => {
        const item = catalog[key];
        return `<div class="inventory-item">
            <img src="${item.imgUrl}">
            <div class="inventory-item-details">
                <h4>${item.name}</h4>
                <p>₦${item.price.toLocaleString()} &bull; ${item.cat}</p>
            </div>
            <button onclick="window.deleteProduct('${key}', '${item.storagePath}')" style="background:none; border:none; color:#ff4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }).join('');
}

window.deleteProduct = async (dbKey, storagePath) => {
    if (!confirm("Delete?")) return;
    try {
        await remove(dbRef(db, `stores/${activeStoreId}/catalog/${dbKey}`));
        try { await deleteObject(storageRef(storage, storagePath)); } catch(e){}
        showToast("Deleted");
        loadDashboardData(); 
    } catch (e) { alert("Failed."); }
};

function showToast(msg) {
    const toast = document.getElementById('status-toast');
    if(toast) {
        toast.innerText = msg;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
}