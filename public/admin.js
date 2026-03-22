import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged,
    linkWithPopup
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

auth.useDeviceLanguage();

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const db = getDatabase(app); 
const storage = getStorage(app);

const MASTER_EMAIL = "kman39980@gmail.com";
let activeStoreId = "", pendingBase64Image = null, pendingProductBase64 = null; 

// --- IMAGE OPTIMIZATION ---
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

// 🔥 Handle Mobile Redirect Result immediately on load
getRedirectResult(auth).catch((err) => console.error("Redirect Result Error:", err));

onAuthStateChanged(auth, async (user) => {
    const loginSec = document.getElementById('login-section');
    const onboardSec = document.getElementById('onboarding-section');
    const dashSec = document.getElementById('dashboard-section');

    // Prevent early display of sections before auth is confirmed
    if (loginSec) loginSec.style.display = 'none';
    if (onboardSec) onboardSec.style.display = 'none';
    if (dashSec) dashSec.style.display = 'none';

    if (user) {
        if (user.email === MASTER_EMAIL) {
            const mBtn = document.getElementById('master-btn');
            if(mBtn) { mBtn.style.display = 'block'; mBtn.removeAttribute('disabled'); }
        }

        const snap = await get(dbRef(db, `users/${user.uid}`));

        if (snap.exists()) {
            activeStoreId = snap.val().storeId;
            if (dashSec) dashSec.style.display = 'block';
            if (typeof loadDashboardData === "function") loadDashboardData();
        } else {
            if (onboardSec) onboardSec.style.display = 'block';
        }

    } else { 
        if (loginSec) loginSec.style.display = 'block';
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
        "Boss\nlet's find your style!"
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

window.loginWithGoogle = async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
        const user = auth.currentUser;

        if (user && user.isAnonymous) {
            await linkWithPopup(user, provider);
        } else {
            // Use Redirect for Mobile and Popup for Laptop
            if (isMobile) {
                await signInWithRedirect(auth, provider);
            } else {
                await signInWithPopup(auth, provider);
            }
        }

    } catch (err) {
        console.error("LOGIN ERROR:", err);

        if (err.code === "auth/popup-blocked") {
            // Fallback for desktop browsers blocking popups
            await signInWithRedirect(auth, provider);
        }

        if (err.code === "auth/popup-closed-by-user") return;

        if (err.code === "auth/credential-already-in-use") {
            isMobile ? await signInWithRedirect(auth, provider) : await signInWithPopup(auth, provider);
            return;
        }

        if (err.code === "auth/cancelled-popup-request") return;

        alert("Login failed. Try again.");
    }
};