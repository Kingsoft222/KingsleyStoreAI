import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// Notice the change here to signInWithRedirect 👇
import { getAuth, signInWithRedirect, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

let currentGoogleUser = null;
let activeStoreId = ""; 
let pendingBase64Image = null; 
let pendingProductBase64 = null; 

// Default Greetings to guide the vendor
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

// 👇 This is the magic bulletproof login update 👇
window.loginWithGoogle = async () => {
    try { 
        await signInWithRedirect(auth, provider); 
    } 
    catch (error) { 
        console.error("Login Error:", error);
        alert("Firebase Error: " + error.message); 
    }
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
            return alert("That username is already taken. Try another.");
        }
        btn.innerText = "Building your store...";
        await set(dbRef(db, `users/${currentGoogleUser.uid}`), { storeId: usernameInput });
        await set(dbRef(db, `stores/${usernameInput}`), {
            storeName: bizName,
            phone: phone,
            greetingsEnabled: true,
            customGreetings: defaultGreetings, // Save defaults on creation
            ownerEmail: currentGoogleUser.email
        });

        activeStoreId = usernameInput;
        document.getElementById('onboarding-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        loadDashboardData();
    } catch (error) {
        alert("Failed to create store.");
        btn.innerText = "Create Store";
        btn.disabled = false;
    }
};

// UI Toggle for Greetings Box
window.toggleGreetingsBox = () => {
    const isChecked = document.getElementById('admin-greetings-toggle').checked;
    document.getElementById('custom-greetings-container').style.display = isChecked ? 'block' : 'none';
};

async function loadDashboardData() {
    try {
        const snapshot = await get(dbRef(db, `stores/${activeStoreId}`));
        const data = snapshot.val();

        if (data) {
            document.getElementById('admin-store-name').value = data.storeName || "";
            document.getElementById('admin-phone').value = data.phone || "";
            
            // Handle Greetings
            const isEnabled = data.greetingsEnabled !== false;
            document.getElementById('admin-greetings-toggle').checked = isEnabled;
            
            // Load custom greetings or fallback to default
            const loadedGreetings = (data.customGreetings && data.customGreetings.length > 0) ? data.customGreetings : defaultGreetings;
            document.getElementById('admin-custom-greetings').value = loadedGreetings.join('\n');
            
            window.toggleGreetingsBox(); // Show/hide based on checkbox state
            
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

            const currentDomain = window.location.origin;
            const storeLink = `${currentDomain}/?store=${activeStoreId}`;
            const linkEl = document.getElementById('my-store-link');
            if(linkEl) {
                linkEl.href = storeLink;
                linkEl.innerText = storeLink;
            }

            renderInventoryList(data.catalog || {});
        }
    } catch (error) { console.error("Error loading dashboard:", error); }
}

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

window.removeAdminImage = async () => {
    if (!activeStoreId) return;
    if(confirm("Are you sure you want to remove your profile picture?")) {
        try {
            await update(dbRef(db, `stores/${activeStoreId}`), { profileImage: null });
            document.getElementById('admin-img-preview').style.display = "none";
            document.getElementById('remove-pic-btn').style.display = "none";
            pendingBase64Image = null;
            showToast("Photo removed!");
        } catch (e) { alert("Failed to remove photo."); }
    }
};

window.saveStoreSettings = async () => {
    if (!activeStoreId) return;
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    try {
        const greetingsEnabled = document.getElementById('admin-greetings-toggle').checked;
        
        // Convert textarea back to a clean Array
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

window.uploadNewProduct = async () => {
    if (!activeStoreId) return;
    
    const name = document.getElementById('prod-name').value.trim();
    const brand = document.getElementById('prod-brand').value;
    const price = document.getElementById('prod-price').value;
    const tags = document.getElementById('prod-tags').value.toLowerCase().trim();
    const btn = document.getElementById('upload-prod-btn');

    if (!name || !price || !pendingProductBase64) return alert("Name, Price, and Photo are required!");

    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;
    btn.disabled = true;

    try {
        const fileId = Date.now();
        const imagePath = `inventory/${activeStoreId}/${fileId}.jpg`;
        const imageRef = storageRef(storage, imagePath);
        await uploadString(imageRef, pendingProductBase64, 'data_url');
        const imageUrl = await getDownloadURL(imageRef);

        const productData = {
            name: name,
            cat: brand, 
            price: Number(price),
            tags: tags,
            imgUrl: imageUrl, 
            storagePath: imagePath 
        };

        await push(dbRef(db, `stores/${activeStoreId}/catalog`), productData);

        document.getElementById('prod-name').value = "";
        document.getElementById('prod-price').value = "";
        document.getElementById('prod-tags').value = "";
        document.getElementById('prod-pic-upload').value = "";
        document.getElementById('prod-img-preview').style.display = "none";
        pendingProductBase64 = null;
        
        showToast("Item added successfully!");
        loadDashboardData(); 

    } catch (error) {
        console.error(error);
        alert("Failed to upload item.");
    }

    btn.innerHTML = `<i class="fas fa-plus"></i> Add Item to Store`;
    btn.disabled = false;
};

function renderInventoryList(catalog) {
    const listDiv = document.getElementById('inventory-list');
    listDiv.innerHTML = ""; 

    const itemKeys = Object.keys(catalog);
    if (itemKeys.length === 0) {
        listDiv.innerHTML = `<p style="text-align:center; color:#666;">Your store is empty. Upload an item above!</p>`;
        return;
    }

    itemKeys.forEach(key => {
        const item = catalog[key];
        listDiv.innerHTML += `
            <div class="inventory-item">
                <img src="${item.imgUrl}" alt="${item.name}">
                <div class="inventory-item-details">
                    <h4>${item.name}</h4>
                    <p>₦${item.price.toLocaleString()} &bull; <span style="color:#666; font-weight:normal;">${item.cat}</span></p>
                </div>
                <button onclick="window.deleteProduct('${key}', '${item.storagePath}')" style="background:none; border:none; color:#ff4444; font-size:1.2rem; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
    });
}

window.deleteProduct = async (dbKey, storagePath) => {
    if (!confirm("Delete this item from your store permanently?")) return;
    
    try {
        await remove(dbRef(db, `stores/${activeStoreId}/catalog/${dbKey}`));
        try { await deleteObject(storageRef(storage, storagePath)); } catch(e){}
        
        showToast("Item deleted");
        loadDashboardData(); 
    } catch (error) { alert("Failed to delete item."); }
};

function showToast(msg) {
    const toast = document.getElementById('status-toast');
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}