import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, get, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// 👇 THE MAGIC HARD-WIRED LINK IS RIGHT HERE 👇
const db = getDatabase(app, "https://kingsleystoreai-default-rtdb.firebaseio.com"); 

const storage = getStorage(app);

let currentGoogleUser = null;
let activeStoreId = ""; // e.g., 'emeka'
let pendingBase64Image = null;

// --- 1. AUTH STATE OBSERVER ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentGoogleUser = user;
        document.getElementById('login-section').style.display = 'none';
        
        // Check if this Google user has created a store yet
        const userMapSnapshot = await get(dbRef(db, `users/${user.uid}`));
        if (userMapSnapshot.exists()) {
            // User exists! Load their dashboard
            activeStoreId = userMapSnapshot.val().storeId;
            document.getElementById('onboarding-section').style.display = 'none';
            document.getElementById('dashboard-section').style.display = 'block';
            loadDashboardData();
        } else {
            // Brand new Google user! Show Onboarding
            document.getElementById('onboarding-section').style.display = 'block';
            document.getElementById('dashboard-section').style.display = 'none';
        }
    } else {
        // Not logged in
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('onboarding-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'none';
        currentGoogleUser = null;
        activeStoreId = "";
    }
});

// --- 2. GOOGLE LOGIN (NOW WITH DIAGNOSTICS) ---
window.loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
        // Observer handles the rest
    } catch (error) {
        console.error("Login Error:", error);
        // THIS IS THE MAGIC LINE: It will tell us exactly why Firebase is blocking it
        alert("Firebase Error: " + error.message); 
    }
};

window.logoutAdmin = () => signOut(auth);

// --- 3. ONBOARDING SETUP (Captured Once) ---
window.completeStoreSetup = async () => {
    const usernameInput = document.getElementById('setup-username').value.toLowerCase().trim().replace(/\s+/g, '');
    const bizName = document.getElementById('setup-bizname').value.trim();
    const phone = document.getElementById('setup-phone').value.trim();
    const btn = document.getElementById('setup-btn');

    if (!usernameInput || !bizName || !phone) return alert("Please fill all fields.");

    btn.innerText = "Checking availability...";
    btn.disabled = true;

    try {
        // Ensure username isn't taken by someone else
        const storeCheck = await get(dbRef(db, `stores/${usernameInput}`));
        if (storeCheck.exists()) {
            btn.innerText = "Create Store";
            btn.disabled = false;
            return alert("That username is already taken. Try another.");
        }

        btn.innerText = "Building your store...";

        // Step A: Map the Google UID to this Store Username
        await set(dbRef(db, `users/${currentGoogleUser.uid}`), { storeId: usernameInput });

        // Step B: Create the actual store profile with the captured WhatsApp number
        await set(dbRef(db, `stores/${usernameInput}`), {
            storeName: bizName,
            phone: phone,
            greetingsEnabled: true,
            ownerEmail: currentGoogleUser.email
        });

        // Trigger UI update
        activeStoreId = usernameInput;
        document.getElementById('onboarding-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        loadDashboardData();

    } catch (error) {
        console.error("Setup Error:", error);
        alert("Failed to create store.");
        btn.innerText = "Create Store";
        btn.disabled = false;
    }
};

// --- 4. LOAD DASHBOARD DATA ---
async function loadDashboardData() {
    try {
        const snapshot = await get(dbRef(db, `stores/${activeStoreId}`));
        const data = snapshot.val();

        if (data) {
            document.getElementById('admin-store-name').value = data.storeName || "";
            document.getElementById('admin-phone').value = data.phone || "";
            document.getElementById('admin-greetings-toggle').checked = data.greetingsEnabled !== false;
            
            const imgPreview = document.getElementById('admin-img-preview');
            imgPreview.src = data.profileImage || "";
            imgPreview.style.display = data.profileImage ? "block" : "none";

            // Generate link
            const currentDomain = window.location.origin;
            const storeLink = `${currentDomain}/?store=${activeStoreId}`;
            const linkEl = document.getElementById('my-store-link');
            linkEl.href = storeLink;
            linkEl.innerText = storeLink;
        }
    } catch (error) { console.error("Error loading dashboard:", error); }
}

// --- 5. IMAGE & SAVING ---
window.handleAdminImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        pendingBase64Image = event.target.result;
        const imgPreview = document.getElementById('admin-img-preview');
        imgPreview.src = pendingBase64Image;
        imgPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
};

window.saveStoreSettings = async () => {
    if (!activeStoreId) return;
    
    const storeName = document.getElementById('admin-store-name').value;
    const phone = document.getElementById('admin-phone').value;
    const greetingsEnabled = document.getElementById('admin-greetings-toggle').checked;
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.innerText = "Saving to Cloud...";
    saveBtn.disabled = true;

    try {
        let updateData = { storeName: storeName, phone: phone, greetingsEnabled: greetingsEnabled };

        if (pendingBase64Image) {
            saveBtn.innerText = "Uploading Image...";
            const imageRef = storageRef(storage, `profiles/${activeStoreId}_profile.jpg`);
            await uploadString(imageRef, pendingBase64Image, 'data_url');
            updateData.profileImage = await getDownloadURL(imageRef);
            pendingBase64Image = null; 
        }

        saveBtn.innerText = "Saving Database...";
        await update(dbRef(db, `stores/${activeStoreId}`), updateData);

        const toast = document.getElementById('status-toast');
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);

    } catch (error) {
        console.error("Save Error:", error);
        alert("Failed to save settings.");
    }

    saveBtn.innerText = "Save Settings";
    saveBtn.disabled = false;
};