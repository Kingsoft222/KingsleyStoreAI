import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, 
    GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAhzPRw3Gw4nN1DlIxDa1KszH69I4bcHPE",
    authDomain: "kingsley-store-ai.vercel.app", 
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e",
    databaseURL: "https://kingsleystoreai-default-rtdb.firebaseio.com" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const db = getDatabase(app); 
const storage = getStorage(app);

const MASTER_EMAIL = "kman39980@gmail.com";
let activeStoreId = "", pendingBase64Image = null, pendingProductBase64 = null; 

async function optimizeImage(base64Str, maxWidth = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8)); 
        };
    });
}

getRedirectResult(auth).catch((err) => console.error("Auth Redirect Error:", err));

// --- 🎯 AUTH ROUTING ---
onAuthStateChanged(auth, async (user) => {
    const loader = document.getElementById('loading-screen');
    const loginSec = document.getElementById('login-section');
    const onboardSec = document.getElementById('onboarding-section');
    const dashSec = document.getElementById('dashboard-section');

    const reveal = (section) => {
        if (loader) loader.style.display = 'none';
        [loginSec, onboardSec, dashSec].forEach(s => { if(s) s.style.display = 'none'; });
        if (section) section.style.display = 'block';
    };

    if (user) {
        if (user.email === MASTER_EMAIL) {
            const mBtn = document.getElementById('master-btn');
            if(mBtn) { mBtn.style.display = 'block'; mBtn.removeAttribute('disabled'); }
            listenForVaultUpdates(); 
        }
        try {
            const snap = await get(dbRef(db, `users/${user.uid}`));
            if (snap.exists()) {
                activeStoreId = snap.val().storeId;
                await loadDashboardData();
                reveal(dashSec);
            } else { reveal(onboardSec); }
        } catch (e) { reveal(loginSec); }
    } else {
        setTimeout(() => { if (!auth.currentUser) reveal(loginSec); }, 800);
    }
});

// --- 👑 MASTER VAULT ---
function listenForVaultUpdates() {
    const vaultBody = document.getElementById('vault-body');
    if (!vaultBody) return;
    onValue(dbRef(db, 'stores'), (snapshot) => {
        const stores = snapshot.val() || {};
        vaultBody.innerHTML = Object.entries(stores).map(([id, s]) => {
            const fullLink = `${window.location.origin}/?store=${id}`;
            const clicks = s.analytics?.whatsappClicks || 0;
            const revenue = s.analytics?.totalRevenue || 0;
            return `
            <tr style="border-bottom:1px solid #222;">
                <td style="padding:10px;"><a href="${fullLink}" target="_blank" style="color:#FFD700; text-decoration:none;">view.mall/${id}</a></td>
                <td style="padding:10px;">${clicks}</td>
                <td style="padding:10px;">₦${revenue.toLocaleString()}</td>
                <td style="padding:10px; display:flex; gap:5px;">
                    <button onclick="window.open('${fullLink}', '_blank')" style="background:#fff; color:#000; padding:5px; font-size:0.7rem; cursor:pointer; font-weight:bold;">AUDIT</button>
                    <button onclick="window.resetStoreRevenue('${id}')" style="background:#e60023; color:#fff; padding:5px; font-size:0.7rem; cursor:pointer; font-weight:bold;">RESET</button>
                </td>
            </tr>`;
        }).join('');
    });
}

window.resetStoreRevenue = async (id) => {
    if(!confirm(`Reset data for ${id}?`)) return;
    await update(dbRef(db, `stores/${id}/analytics`), { totalRevenue: 0, whatsappClicks: 0 });
    showToast("Reset Complete");
};

// --- 🎯 DASHBOARD DATA ---
async function loadDashboardData() {
    if(!activeStoreId) return;
    const snap = await get(dbRef(db, `stores/${activeStoreId}`));
    const data = snap.val();
    if (data) {
        document.getElementById('admin-store-name').value = data.storeName || "";
        document.getElementById('admin-phone').value = data.phone || "";
        document.getElementById('admin-search-hint').value = data.searchHint || "";
        document.getElementById('admin-label-1').value = data.label1 || "";
        document.getElementById('admin-label-2').value = data.label2 || "";
        const greetText = document.getElementById('admin-greetings');
        if (greetText) greetText.value = (data.customGreetings || []).join('\n');
        document.getElementById('greetings-toggle').checked = data.greetingsEnabled !== false;
        const imgP = document.getElementById('admin-img-preview');
        imgP.style.display = "block";
        imgP.src = data.profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }
        renderInventoryList(data.catalog || {});
    }
}

function renderInventoryList(catalog) {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item">
            <img src="${catalog[k].imgUrl}">
            <div class="inventory-item-details">
                <h4>${catalog[k].name}</h4>
                <p>₦${catalog[k].price.toLocaleString()} (${catalog[k].category})</p>
            </div>
            <button onclick="window.deleteProduct('${k}', '${catalog[k].storagePath}')" class="btn-danger"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

// --- 🎯 PRODUCT LOGIC (FIXED) ---
window.handleProductImagePreview = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingProductBase64 = ev.target.result;
        document.getElementById('prod-img-preview').src = ev.target.result;
        document.getElementById('prod-img-wrap').style.display = 'inline-block';
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.clearProductImage = () => {
    pendingProductBase64 = null;
    document.getElementById('prod-pic-upload').value = "";
    document.getElementById('prod-img-wrap').style.display = 'none';
};

window.uploadNewProduct = async () => {
    const nameEl = document.getElementById('prod-name');
    const priceEl = document.getElementById('prod-price');
    const brand = document.getElementById('prod-brand').value;
    const btn = document.getElementById('upload-prod-btn');
    if (!nameEl.value || !priceEl.value || !pendingProductBase64) return alert("Missing Info!");
    
    btn.innerText = "Processing..."; btn.disabled = true;
    try {
        const optimized = await optimizeImage(pendingProductBase64);
        const id = Date.now();
        const path = `inventory/${activeStoreId}/${id}.jpg`;
        const sRef = storageRef(storage, path);
        await uploadString(sRef, optimized, 'data_url', { contentType: 'image/jpeg' });
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameEl.value, price: Number(priceEl.value), category: brand, imgUrl: url, storagePath: path 
        });
        
        // 🔥 AUTO-CLEAR ALL FIELDS
        nameEl.value = "";
        priceEl.value = "";
        window.clearProductImage();
        
        showToast("Product Added!");
        loadDashboardData();
    } catch (e) { alert(e.message); }
    finally { btn.innerText = "Add Item to Store"; btn.disabled = false; }
};

window.saveStoreSettings = async () => {
    const btn = document.getElementById('save-btn');
    btn.innerText = "Saving..."; btn.disabled = true;
    try {
        const updateData = {
            storeName: document.getElementById('admin-store-name').value,
            phone: document.getElementById('admin-phone').value,
            searchHint: document.getElementById('admin-search-hint').value,
            label1: document.getElementById('admin-label-1').value,
            label2: document.getElementById('admin-label-2').value,
            greetingsEnabled: document.getElementById('greetings-toggle').checked,
            customGreetings: document.getElementById('admin-greetings').value.split('\n')
        };
        if(pendingBase64Image) {
            const optP = await optimizeImage(pendingBase64Image, 512);
            const ref = storageRef(storage, `profiles/${activeStoreId}.jpg`);
            await uploadString(ref, optP, 'data_url', { contentType: 'image/jpeg' });
            updateData.profileImage = await getDownloadURL(ref);
        }
        await update(dbRef(db, `stores/${activeStoreId}`), updateData);
        showToast("Updated!");
        loadDashboardData();
    } catch (e) { alert(e.message); }
    finally { btn.innerText = "Save Settings"; btn.disabled = false; }
};

window.handleAdminImage = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingBase64Image = ev.target.result;
        document.getElementById('admin-img-preview').src = ev.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.createStoreProfile = async () => {
    const user = auth.currentUser;
    const username = document.getElementById('setup-username').value.trim().toLowerCase().replace(/\s+/g, '');
    const bizName = document.getElementById('setup-bizname').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    try {
        await set(dbRef(db, `users/${user.uid}`), { storeId: username, email: user.email });
        await set(dbRef(db, `stores/${username}`), { 
            storeName: bizName, phone: phone, ownerEmail: user.email, 
            label1: "Ladies Wear", label2: "Men Wear", greetingsEnabled: true 
        });
        window.location.reload(); 
    } catch (e) { alert(e.message); }
};

window.deleteProduct = async (k, path) => {
    if(!confirm("Delete?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    try { if(path) await deleteObject(storageRef(storage, path)); } catch(e) {}
    loadDashboardData();
};

window.toggleMasterVault = () => {
    const v = document.getElementById('master-vault-section');
    if(v) v.style.display = v.style.display === 'none' ? 'block' : 'none';
};

window.logoutAdmin = () => signOut(auth).then(() => window.location.reload());
window.loginWithGoogle = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) signInWithRedirect(auth, provider); else signInWithPopup(auth, provider);
};
function showToast(m) { const t = document.getElementById('status-toast'); if(t) { t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); } }