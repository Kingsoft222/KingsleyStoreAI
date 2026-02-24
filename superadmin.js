import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// IMPORTANT: Ensure these match your actual Firebase config!
const firebaseConfig = {
    apiKey: "AIzaSyAhzPRw3Gw4nN1DlIxDa1KszH69I4bcHPE",
    authDomain: "kingsleystoreai.firebaseapp.com",
    databaseURL: "https://kingsleystoreai-default-rtdb.firebaseio.com",
    projectId: "kingsleystoreai",
    storageBucket: "kingsleystoreai.firebasestorage.app",
    messagingSenderId: "31402654971",
    appId: "1:31402654971:web:26f75b0f913bcaf9f6445e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

// 👉 The Master Key 
const SUPER_ADMIN_EMAIL = "karlkingsoft@gmail.com"; 

document.getElementById('login-btn').addEventListener('click', () => window.loginSuperAdmin());
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

window.loginSuperAdmin = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email !== SUPER_ADMIN_EMAIL) {
            alert("SECURITY ALERT: You are not authorized to view the master ledger.");
            signOut(auth);
            return;
        }
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadGlobalLedger();
    } else {
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
    }
});

async function loadGlobalLedger() {
    try {
        const snapshot = await get(ref(db, 'global_orders'));
        const orders = snapshot.val() || {};
        const tbody = document.getElementById('ledger-body');
        
        let totalOrders = 0;
        let totalGmv = 0;
        tbody.innerHTML = "";

        // Convert object to array and reverse to show newest first
        const orderArray = Object.keys(orders).map(key => orders[key]).reverse();

        if(orderArray.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #888;">No orders on the platform yet.</td></tr>`;
            return;
        }

        orderArray.forEach(order => {
            totalOrders++;
            totalGmv += Number(order.price);
            
            const dateObj = new Date(order.timestamp);
            const niceDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            tbody.innerHTML += `
                <tr>
                    <td style="color:#aaa; font-size:0.9rem;">${niceDate}</td>
                    <td style="color:#00ffcc; font-weight:bold;">@${order.storeId}</td>
                    <td>${order.item}</td>
                    <td style="color:#ffcc00; font-weight:bold;">₦${order.price.toLocaleString()}</td>
                </tr>
            `;
        });

        document.getElementById('total-orders').innerText = totalOrders;
        document.getElementById('total-gmv').innerText = "₦" + totalGmv.toLocaleString();

    } catch (error) {
        console.error(error);
        alert("Failed to read global orders. Did you update the Firebase Database Rules?");
    }
}