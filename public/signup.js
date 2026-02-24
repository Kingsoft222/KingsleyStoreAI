import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref as dbRef, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    authDomain: "kingsleystoreai.firebaseapp.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    databaseURL: "https://kingsleystoreai-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.registerAdmin = async () => {
    const fName = document.getElementById('reg-fname').value.trim();
    const lName = document.getElementById('reg-lname').value.trim();
    let username = document.getElementById('reg-username').value.toLowerCase().trim().replace(/\s+/g, '');
    const bizName = document.getElementById('reg-bizname').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const passConfirm = document.getElementById('reg-pass-confirm').value;
    const btn = document.getElementById('signup-btn');

    if (!fName || !lName || !username || !bizName || !pass) return alert("All fields are required.");
    if (pass !== passConfirm) return alert("Passwords do not match.");
    if (pass.length < 6) return alert("Password must be at least 6 characters.");

    btn.innerText = "Creating Store...";
    btn.disabled = true;

    try {
        // 1. Check if username is already taken
        const usernameCheck = await get(dbRef(db, `stores/${username}`));
        if (usernameCheck.exists()) {
            btn.innerText = "Signup";
            btn.disabled = false;
            return alert("This username is already taken. Please choose another.");
        }

        // 2. Create Auth Account (Mapping username to a hidden email format)
        const fakeEmail = `${username}@virtualmall.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, pass);
        const user = userCredential.user;

        // 3. Save initial store data to Database
        await set(dbRef(db, `stores/${username}`), {
            uid: user.uid,
            firstName: fName,
            surname: lName,
            storeName: bizName,
            username: username,
            greetingsEnabled: true,
            createdAt: new Date().toISOString()
        });

        // 4. Success & Redirect
        const toast = document.getElementById('status-toast');
        toast.style.display = 'block';
        
        setTimeout(() => {
            window.location.href = "./admin.html"; // Redirect to login/dashboard
        }, 1500);

    } catch (error) {
        console.error("Signup Error:", error);
        alert(error.message);
        btn.innerText = "Signup";
        btn.disabled = false;
    }
};