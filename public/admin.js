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

// 🔥 PERSISTENCE: Must stay Local to keep users logged in
setPersistence(auth, browserLocalPersistence);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const db = getDatabase(app); 
const storage = getStorage(app);

const MASTER_EMAIL = "kman39980@gmail.com";
let activeStoreId = "";
let isRouting = false; 

// --- 🎯 AUTH ROUTING LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (isRouting) return; // Prevent double-firing
    isRouting = true;

    const loginSec = document.getElementById('login-section');
    const onboardSec = document.getElementById('onboarding-section');
    const dashSec = document.getElementById('dashboard-section');

    // Function to show only one section safely
    const showOnly = (target) => {
        [loginSec, onboardSec, dashSec].forEach(s => { if(s) s.style.display = 'none'; });
        if (target) target.style.display = 'block';
    };

    if (user) {
        if (user.email === MASTER_EMAIL) {
            const mBtn = document.getElementById('master-btn');
            if(mBtn) { mBtn.style.display = 'block'; mBtn.removeAttribute('disabled'); }
        }

        try {
            const snap = await get(dbRef(db, `users/${user.uid}`));
            if (snap.exists()) {
                activeStoreId = snap.val().storeId;
                showOnly(dashSec);
                loadDashboardData();
            } else {
                showOnly(onboardSec);
            }
        } catch (e) {
            showOnly(loginSec);
        }
    } else {
        // Safe-delay for mobile persistence to kick in
        setTimeout(() => {
            if (!auth.currentUser) showOnly(loginSec);
        }, 800);
    }
    isRouting = false;
});

// --- 🎯 EXISTING STORE LOGIC (DO NOT ALTER) ---
window.createStoreProfile = async () => {
    const user = auth.currentUser;
    const username = document.getElementById('setup-username').value.trim().toLowerCase().replace(/\s+/g, '');
    const bizName = document.getElementById('setup-bizname').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    if(!username || !bizName || !phone) return alert("Fill all fields!");
    const check = await get(dbRef(db, `stores/${username}`));
    if(check.exists()) return alert("Username taken!");
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
        const imgP = document.getElementById('admin-img-preview');
        imgP.style.display = "block";
        imgP.src = data.profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
        const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
        const linkEl = document.getElementById('my-store-link');
        if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }
        renderInventoryList(data.catalog || {});
    }
}

// ... Rest of your existing functions (uploadNewProduct, saveStoreSettings, handleAdminImage, renderInventoryList, deleteProduct, toggleMasterVault) remain the same.
// Ensure you copy them from your previous backup to keep the file complete.

window.logoutAdmin = () => signOut(auth).then(() => window.location.reload());
window.loginWithGoogle = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) { signInWithRedirect(auth, provider); } 
    else { signInWithPopup(auth, provider); }
};