import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged, 
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, update, push, remove, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
// --- 👑 FOUNDER'S REAL-TIME RECORDS (FIXED LINKS) ---
function listenForNewUsers() {
    const userTableBody = document.getElementById('user-records-body');
    if (!userTableBody) return;

    onValue(dbRef(db, 'users'), (snapshot) => {
        const users = snapshot.val() || {};
        userTableBody.innerHTML = Object.entries(users).map(([uid, data]) => {
            const storeId = data.storeId || "unknown";
            // 🔥 This generates the clickable profile link
            const fullLink = `${window.location.origin}/?store=${storeId}`;
            
            return `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:15px; font-size:0.9rem; color:#111;">${data.email || 'Anonymous'}</td>
                <td style="padding:15px;">
                    <a href="${fullLink}" target="_blank" style="color:#e60023; font-weight:800; text-decoration:none;">
                        view.mall/${storeId} 🔗
                    </a>
                </td>
                <td style="padding:15px; font-size:0.8rem; color:#888;">
                    ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Existing User'}
                </td>
                <td style="padding:15px;">
                    <button onclick="window.open('${fullLink}', '_blank')" 
                            style="background:#111; color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700;">
                        AUDIT STORE
                    </button>
                </td>
            </tr>`;
        }).join('');
    });
}
// --- 🎯 IMAGE OPTIMIZATION (Restored) ---
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

// --- 🎯 AUTH ROUTING (Instant Access Fix) ---
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
            listenForNewUsers(); // 🔥 Triggers live links for Founder
        }
        try {
            const snap = await get(dbRef(db, `users/${user.uid}`));
            if (snap.exists()) {
                activeStoreId = snap.val().storeId;
                await loadDashboardData();
                reveal(dashSec);
            } else {
                reveal(onboardSec);
            }
        } catch (e) { reveal(loginSec); }
    } else {
        setTimeout(() => { if (!auth.currentUser) reveal(loginSec); }, 800);
    }
});

// --- 🎯 RECORDS & DATA LOADING ---
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

// --- 🎯 INVENTORY RENDERING ---
function renderInventoryList(catalog) {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item">
            <img src="${catalog[k].imgUrl}">
            <div class="inventory-item-details">
                <h4>${catalog[k].name}</h4>
                <p>₦${catalog[k].price.toLocaleString()} (${catalog[k].category || 'General'})</p>
            </div>
            <button onclick="window.deleteProduct('${k}', '${catalog[k].storagePath}')" class="btn-danger"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

// --- 🎯 PRODUCT UPLOAD (Restored) ---
window.uploadNewProduct = async () => {
    const nameInput = document.getElementById('prod-name');
    const priceInput = document.getElementById('prod-price');
    const brandInput = document.getElementById('prod-brand');
    const btn = document.getElementById('upload-prod-btn');
    if (!nameInput.value || !priceInput.value || !pendingProductBase64) return alert("Fill Name, Price & Photo!");
    btn.innerText = "Processing AI Image..."; btn.disabled = true;
    try {
        const optimizedImg = await optimizeImage(pendingProductBase64);
        const id = Date.now();
        const path = `inventory/${activeStoreId}/${id}.jpg`;
        const sRef = storageRef(storage, path);
        await uploadString(sRef, optimizedImg, 'data_url', { contentType: 'image/jpeg' });
        const url = await getDownloadURL(sRef);
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameInput.value, price: Number(priceInput.value),
            category: brandInput.value, imgUrl: url, storagePath: path 
        });
        nameInput.value = ""; priceInput.value = ""; 
        document.getElementById('prod-img-preview').style.display = "none";
        pendingProductBase64 = null;
        showToast("Product Added!");
        loadDashboardData();
    } catch (e) { alert("Upload error: " + e.message); } 
    finally { btn.innerText = "Add Item to Store"; btn.disabled = false; }
};

// --- 🎯 STORE SETTINGS (Restored) ---
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
            customGreetings: document.getElementById('admin-greetings').value.split('\n').filter(g => g.trim() !== "")
        };
        if(pendingBase64Image) {
            const optimizedProfile = await optimizeImage(pendingBase64Image, 512); 
            const ref = storageRef(storage, `profiles/${activeStoreId}.jpg`);
            await uploadString(ref, optimizedProfile, 'data_url', { contentType: 'image/jpeg' });
            updateData.profileImage = await getDownloadURL(ref);
            pendingBase64Image = null;
        }
        await update(dbRef(db, `stores/${activeStoreId}`), updateData);
        showToast("Settings Updated!");
        loadDashboardData();
    } catch (e) { alert("Save failed: " + e.message); } 
    finally { btn.innerText = "Save Settings"; btn.disabled = false; }
};

// --- 🎯 STORE CREATION (Restored) ---
window.createStoreProfile = async () => {
    const user = auth.currentUser;
    const username = document.getElementById('setup-username').value.trim().toLowerCase().replace(/\s+/g, '');
    const bizName = document.getElementById('setup-bizname').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    if(!username || !bizName || !phone) return alert("Fill all fields!");
    try {
        await set(dbRef(db, `users/${user.uid}`), { storeId: username, email: user.email });
        await set(dbRef(db, `stores/${username}`), { 
            storeName: bizName, phone: phone, ownerEmail: user.email, verified: false,
            label1: "Ladies Wear", label2: "Men Wear", greetingsEnabled: true,
            analytics: { whatsappClicks: 0, totalRevenue: 0 } 
        });
        window.location.reload(); 
    } catch (e) { alert("Setup failed: " + e.message); }
};

// --- 🎯 HELPERS & VAULT (Restored) ---
window.handleAdminImage = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        pendingBase64Image = ev.target.result;
        document.getElementById('admin-img-preview').src = ev.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
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

window.deleteProduct = async (k, path) => {
    if (!confirm("Delete product?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    try { if(path) await deleteObject(storageRef(storage, path)); } catch(e) {}
    loadDashboardData();
};
// --- 👑 FOUNDER'S CONTROL ROOM (FIXED LINKS) ---
window.toggleMasterVault = () => {
    const vaultSection = document.getElementById('master-vault-section');
    if (vaultSection) {
        vaultSection.style.display = (vaultSection.style.display === 'none') ? 'block' : 'none';
    }
};

function listenForNewUsers() {
    const userTableBody = document.getElementById('user-records-body');
    if (!userTableBody) return;

    // 🔥 Real-time listener for the users node
    onValue(dbRef(db, 'users'), (snapshot) => {
        const users = snapshot.val() || {};
        userTableBody.innerHTML = Object.entries(users).map(([uid, data]) => {
            const storeId = data.storeId || "unknown";
            // 🔥 This generates the clickable profile link
            const fullLink = `${window.location.origin}/?store=${storeId}`;
            
            return `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:15px; font-size:0.9rem; color:#111;">${data.email || 'Anonymous'}</td>
                <td style="padding:15px;">
                    <a href="${fullLink}" target="_blank" style="color:#e60023; font-weight:800; text-decoration:none;">
                        view.mall/${storeId} 🔗
                    </a>
                </td>
                <td style="padding:15px; font-size:0.8rem; color:#888;">
                    ${data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Existing User'}
                </td>
                <td style="padding:15px;">
                    <button onclick="window.open('${fullLink}', '_blank')" 
                            style="background:#111; color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700;">
                        AUDIT STORE
                    </button>
                </td>
            </tr>`;
        }).join('');
    });
}

window.logoutAdmin = () => signOut(auth).then(() => window.location.reload());
window.loginWithGoogle = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) signInWithRedirect(auth, provider); else signInWithPopup(auth, provider);
};
function showToast(m) { const t = document.getElementById('status-toast'); if(t) { t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); } }