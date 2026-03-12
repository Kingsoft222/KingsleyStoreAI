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
provider.setCustomParameters({ prompt: 'select_account' });
const db = getDatabase(app); 
const storage = getStorage(app);

const MASTER_EMAIL = "kman39980@gmail.com";
let activeStoreId = "", pendingBase64Image = null, pendingProductBase64 = null; 

// --- PERMANENT SPEED FIX: CLIENT-SIDE COMPRESSION ---
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

onAuthStateChanged(auth, async (user) => {
    const loginSec = document.getElementById('login-section');
    const onboardSec = document.getElementById('onboarding-section');
    const dashSec = document.getElementById('dashboard-section');
    if (user) {
        if (user.email === MASTER_EMAIL) {
            const mBtn = document.getElementById('master-btn');
            if(mBtn) { mBtn.style.display = 'block'; mBtn.removeAttribute('disabled'); }
        }
        const snap = await get(dbRef(db, `users/${user.uid}`));
        if (snap.exists()) {
            activeStoreId = snap.val().storeId;
            loginSec.style.display = 'none';
            if(onboardSec) onboardSec.style.display = 'none';
            dashSec.style.display = 'block';
            loadDashboardData();
        } else {
            loginSec.style.display = 'none';
            dashSec.style.display = 'none';
            if(onboardSec) onboardSec.style.display = 'block';
        }
    } else { 
        loginSec.style.display = 'block';
        dashSec.style.display = 'none';
        if(onboardSec) onboardSec.style.display = 'none';
    }
});

window.createStoreProfile = async () => {
    const user = auth.currentUser;
    const username = document.getElementById('setup-username').value.trim().toLowerCase().replace(/\s+/g, '');
    const bizName = document.getElementById('setup-bizname').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    
    if(!username || !bizName || !phone) return alert("Fill all fields!");
    
    const check = await get(dbRef(db, `stores/${username}`));
    if(check.exists()) return alert("Username taken!");

    const finalGreetings = [
        "Nne\nwhat are you looking for today?",
        "My guy\nwhat are you looking for today?",
        "Classic Man\nwhat are you looking for today?",
        "Chief\nlooking for premium native?",
        "Boss\nlet's find your style!",
        "Classic Babe\nwhat are you looking for today?",
        "Baddie\nlet's find your style!"
    ];

    try {
        await set(dbRef(db, `users/${user.uid}`), { storeId: username, email: user.email });
        await set(dbRef(db, `stores/${username}`), { 
            storeName: bizName, 
            phone: phone,
            ownerEmail: user.email, 
            label1: "Ladies Wear",
            label2: "Men Wear",
            customGreetings: finalGreetings,
            greetingsEnabled: true,
            analytics: { whatsappClicks: 0, totalRevenue: 0 } 
        });
        window.location.reload(); 
    } catch (e) {
        alert("Setup failed: " + e.message);
    }
};

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
        const rmBtn = document.getElementById('remove-pic-btn');
        const photoChangeBtn = document.querySelector("button[onclick*='admin-pic-upload']");
        
        imgP.style.display = "block";
        if(rmBtn) rmBtn.style.display = "inline-block";
        
        if (data.profileImage) { 
            imgP.src = data.profileImage; 
            if(photoChangeBtn) photoChangeBtn.innerText = "Change Photo";
        } else {
            imgP.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
            if(photoChangeBtn) photoChangeBtn.innerText = "Upload Photo";
        }
        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }
        renderInventoryList(data.catalog || {});
    }
}

window.uploadNewProduct = async () => {
    const nameInput = document.getElementById('prod-name');
    const priceInput = document.getElementById('prod-price');
    const tagsInput = document.getElementById('prod-tags');
    const brandInput = document.getElementById('prod-brand');
    const btn = document.getElementById('upload-prod-btn');

    if (!nameInput.value || !priceInput.value || !pendingProductBase64) return alert("Fill Name, Price & Photo!");

    btn.innerText = "Processing..."; 
    btn.disabled = true;
    
    try {
        // Optimize image to under 200KB so the AI processes it instantly
        const optimizedImg = await optimizeImage(pendingProductBase64);
        
        const id = Date.now();
        const path = `inventory/${activeStoreId}/${id}.jpg`;
        const sRef = storageRef(storage, path);
        
        const metadata = { 
            contentType: 'image/jpeg',
            cacheControl: 'public,max-age=3600'
        };
        
        await uploadString(sRef, optimizedImg, 'data_url', metadata);
        const url = await getDownloadURL(sRef);
        
        // REVERTED: Using original DB structure so AI Worker sees it immediately
        await push(dbRef(db, `stores/${activeStoreId}/catalog`), { 
            name: nameInput.value, 
            price: Number(priceInput.value),
            cat: brandInput.value,
            tags: tagsInput.value || "", 
            imgUrl: url, 
            storagePath: path 
        });

        nameInput.value = ""; priceInput.value = ""; tagsInput.value = "";
        document.getElementById('prod-img-preview').style.display = "none";
        pendingProductBase64 = null;
        
        showToast("Product Added Successfully!");
        loadDashboardData();
    } catch (e) { 
        alert("Upload error: " + e.message); 
    } finally {
        btn.innerText = "Add Item to Store"; btn.disabled = false;
    }
};

window.saveStoreSettings = async () => {
    if(!activeStoreId) return alert("Error: No Store ID.");
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
        showToast("Saved!");
        loadDashboardData();
    } catch (e) {
        alert("Save failed: " + e.message);
    } finally {
        btn.innerText = "Save Settings"; btn.disabled = false;
    }
};

window.removeAdminImage = async () => {
    if(!confirm("Permanently remove profile photo?")) return;
    await update(dbRef(db, `stores/${activeStoreId}`), { profileImage: null });
    loadDashboardData();
    showToast("Photo Removed");
};

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

function renderInventoryList(catalog) {
    document.getElementById('inventory-list').innerHTML = Object.keys(catalog).map(k => `
        <div class="inventory-item"><img src="${catalog[k].imgUrl}">
        <div class="inventory-item-details"><h4>${catalog[k].name}</h4><p>₦${catalog[k].price.toLocaleString()}</p></div>
        <button onclick="window.deleteProduct('${k}', '${catalog[k].storagePath}')"><i class="fas fa-trash"></i></button></div>`).join('');
}

window.deleteProduct = async (k, path) => {
    if (!confirm("Delete product?")) return;
    await remove(dbRef(db, `stores/${activeStoreId}/catalog/${k}`));
    try { await deleteObject(storageRef(storage, path)); } catch(e) {}
    loadDashboardData();
};

window.toggleMasterVault = async () => {
    const vaultSection = document.getElementById('master-vault-section');
    if (!vaultSection) return;
    if (vaultSection.style.display === 'none') {
        vaultSection.style.display = 'block';
        const snap = await get(dbRef(db, 'stores'));
        const stores = snap.val() || {};
        const body = document.getElementById('vault-body');
        if(body) {
            body.innerHTML = Object.entries(stores).map(([id, s]) => `
                <tr><td>${id}</td><td>${s.storeName || 'N/A'}</td><td>${s.analytics?.whatsappClicks || 0}</td><td>₦${(s.analytics?.totalRevenue || 0).toLocaleString()}</td>
                <td><button onclick="window.auditVendorReceipts('${id}')">Audit</button></td></tr>`).join('');
        }
    } else { vaultSection.style.display = 'none'; }
};

window.auditVendorReceipts = async (vendorId) => {
    alert("Auditing receipts for: " + vendorId);
};

window.logoutAdmin = () => signOut(auth).then(() => window.location.reload());
window.loginWithGoogle = () => signInWithPopup(auth, provider);
function showToast(m) { const t = document.getElementById('status-toast'); if(t) { t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); } }