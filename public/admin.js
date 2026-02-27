import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, update, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
let activeStoreId = "", pendingProductBase64 = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === MASTER_EMAIL) document.getElementById('master-btn').style.display = 'block';
        const snap = await get(dbRef(db, `users/${user.uid}`));
        if (snap.exists()) {
            activeStoreId = snap.val().storeId;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            loadDashboardData();
        }
    }
});

async function loadDashboardData() {
    const snap = await get(dbRef(db, `stores/${activeStoreId}`));
    const data = snap.val();
    if (data) {
        document.getElementById('admin-store-name').value = data.storeName || "";
        document.getElementById('admin-phone').value = data.phone || "";
        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.innerText = storeLink; linkEl.href = storeLink; }
        renderInventoryList(data.catalog || {});
    }
}

// --- COMMAND CENTER / MASTER VAULT ---
window.toggleMasterVault = async () => {
    const section = document.getElementById('master-vault-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    const snap = await get(dbRef(db, 'stores'));
    const all = snap.val();
    document.getElementById('vault-body').innerHTML = Object.keys(all).map(id => `<tr><td>${id}</td><td>${all[id].phone}</td></tr>`).join('');
};

window.uploadNewProduct = async () => {
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    if (!name || !price || !pendingProductBase64) return alert("Fill Name, Price & Image!");
    try {
        const id = Date.now(), path = `inventory/${activeStoreId}/${id}.jpg`;
        await uploadString(storageRef(storage, path), pendingProductBase64, 'data_url');
        const url = await getDownloadURL(storageRef(storage, path));
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { name, price: Number(price), imgUrl: url, storagePath: path });
        // SWIFT RESET
        document.getElementById('prod-name').value = "";
        document.getElementById('prod-price').value = "";
        loadDashboardData();
    } catch (e) { alert("Failed."); }
};

window.handleProductImagePreview = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => { pendingProductBase64 = ev.target.result; document.getElementById('prod-img-preview').src = ev.target.result; document.getElementById('prod-img-preview').style.display = 'block'; };
    reader.readAsDataURL(e.target.files[0]);
};

function renderInventoryList(catalog) {
    document.getElementById('inventory-list').innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item">
            <img src="${catalog[k].imgUrl}">
            <div><h4>${catalog[k].name}</h4><p>₦${catalog[k].price.toLocaleString()}</p></div>
        </div>`).join('');
}

window.loginWithGoogle = () => signInWithPopup(auth, provider);
window.logoutAdmin = () => signOut(auth);
function showToast(m) { const t = document.getElementById('status-toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }