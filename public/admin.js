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
            ownerEmail: currentGoogleUser.email,
            quickSearches: ["Native Wear", "Jeans", "Corporate", "Bridal"],
            searchHint: "Search Senator or Ankara" // NEW
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
            
            // LOAD SEARCH HINT
            const hintInput = document.getElementById('admin-search-hint');
            if(hintInput) hintInput.value = data.searchHint || "Search Senator or Ankara";

            document.getElementById('admin-greetings-toggle').checked = data.greetingsEnabled !== false;
            const loadedGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : defaultGreetings;
            document.getElementById('admin-custom-greetings').value = loadedGreetings.join('\n');
            
            const qsInput = document.getElementById('admin-quick-searches');
            if (qsInput && data.quickSearches) qsInput.value = data.quickSearches.join(', ');

            window.toggleGreetingsBox(); 
            const imgPreview = document.getElementById('admin-img-preview');
            const removeBtn = document.getElementById('remove-pic-btn');
            if (data.profileImage) {
                imgPreview.src = data.profileImage;
                imgPreview.style.display = "block";
                removeBtn.style.display = "inline-block";
            } else {
                imgPreview.style.display = "none";
                removeBtn.style.display = "none";
            }
            
            const storeLink = `${window.location.origin}/?store=${activeStoreId}`;
            const linkEl = document.getElementById('my-store-link');
            if(linkEl) { linkEl.href = storeLink; linkEl.innerText = storeLink; }

            renderInventoryList(data.catalog || {});
            renderOrderHistory(data.orders || {});
        }
    } catch (e) { console.error(e); }
}

window.saveStoreSettings = async () => {
    if (!activeStoreId) return;
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    try {
        const greetingsEnabled = document.getElementById('admin-greetings-toggle').checked;
        const rawGreetings = document.getElementById('admin-custom-greetings').value;
        const customGreetingsArray = rawGreetings.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        const qsInputRaw = document.getElementById('admin-quick-searches').value;
        const genderKeywords = ["men", "ladies", "women", "man", "woman", "girls", "boys"];
        const qsArray = qsInputRaw.split(',').map(tag => {
            const words = tag.trim().split(/\s+/);
            if (words.length <= 3) return tag.trim();
            const genderWord = words.find(w => genderKeywords.includes(w.toLowerCase()));
            return genderWord ? `${words[0]} ${words[1]} ${genderWord}` : words.slice(0, 3).join(' ');
        }).filter(tag => tag.length > 0);

        let updateData = { 
            storeName: document.getElementById('admin-store-name').value, 
            phone: document.getElementById('admin-phone').value,
            searchHint: document.getElementById('admin-search-hint').value, // NEW
            greetingsEnabled: greetingsEnabled,
            customGreetings: customGreetingsArray,
            quickSearches: qsArray
        };

        if (pendingBase64Image) {
            const imageRef = storageRef(storage, `profiles/${activeStoreId}_profile.jpg`);
            await uploadString(imageRef, pendingBase64Image, 'data_url');
            updateData.profileImage = await getDownloadURL(imageRef);
            pendingBase64Image = null; 
        }

        await update(dbRef(db, `stores/${activeStoreId}`), updateData);
        document.getElementById('admin-quick-searches').value = qsArray.join(', ');
        showToast("Profile Saved!");
    } catch (error) { alert("Failed to save."); }
    saveBtn.innerText = "Save Profile Settings";
    saveBtn.disabled = false;
};

// ... (Other functions like toggleMasterVault, renderInventoryList, etc. remain the same as your original)
// [Note: Make sure to keep your existing deleteProduct, renderOrderHistory, and showToast functions at the end!]