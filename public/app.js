/**

 * Kingsley Store AI - Core Logic v7.0

 * DOPPL CINEMATIC REVEAL: Full-screen luxury forensic swap.

 * NO MORE VIDEO LOOP: Focused on high-fidelity result unveil.

 */



const clothesCatalog = [

    { id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" },

    { id: 2, name: "Blue Ankara Suite", tags: "ankara blue native", img: "ankara_blue.jpg", price: "₦22k" }

];



const greetings = [

    "Nne, what are you looking for today?", "My guy, what are you looking for today?",

    "Classic Babe, what are you looking for today?", "Boss, what are you looking for today?",

    "Classic Man, what are you looking for today?", "Chief, looking for premium native?",

    "Baddie, let's find your style!"

];



let gIndex = 0;

let userPhoto = "";

let selectedCloth = null;

let cartCount = 0;



// --- PROFILE & BOOTSTRAP ---

document.addEventListener('DOMContentLoaded', () => {

    const saved = localStorage.getItem('kingsley_profile_locked');

    if (saved) { document.getElementById('owner-img').src = saved; userPhoto = saved; }

   

    setInterval(() => {

        const el = document.getElementById('dynamic-greeting');

        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }

    }, 2000);



    if ('webkitSpeechRecognition' in window) {

        const rec = new webkitSpeechRecognition();

        const micBtn = document.getElementById('mic-btn');

        micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };

        rec.onresult = (e) => {

            document.getElementById('ai-input').value = e.results[0][0].transcript;

            micBtn.style.color = "#5f6368";

            window.executeSearch();

        };

    }

});



window.handleProfileUpload = (e) => {

    const reader = new FileReader();

    reader.onload = (event) => {

        document.getElementById('owner-img').src = event.target.result;

        localStorage.setItem('kingsley_profile_locked', event.target.result);

        userPhoto = event.target.result;

    };

    reader.readAsDataURL(e.target.files[0]);

};



window.clearProfileData = () => {

    localStorage.removeItem('kingsley_profile_locked');

    document.getElementById('owner-img').src = "images/kingsley.jpg";

    userPhoto = "";

};



// --- NAVIGATION & SEARCH ---

window.executeSearch = () => {

    const input = document.getElementById('ai-input').value.toLowerCase();

    const results = document.getElementById('ai-results');

    if (!input.trim()) return;



    const matched = clothesCatalog.filter(item =>

        item.name.toLowerCase().includes(input) || item.tags.toLowerCase().includes(input)

    );



    if (matched.length > 0) {

        results.style.display = 'grid';

        results.innerHTML = matched.map(item => `

            <div class="result-card" onclick="window.initiateDoppl(${item.id})">

                <img src="images/${item.img}" alt="${item.name}">

                <h4>${item.name}</h4>

                <p style="color:#e60023; font-weight:bold;">${item.price}</p>

            </div>

        `).join('');

    }

};



window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };



// --- THE DOPPL REVEAL LOGIC ---

window.initiateDoppl = (id) => {

    selectedCloth = clothesCatalog.find(c => c.id === id);

    if (!userPhoto) {

        alert("Please upload your profile photo first!");

        return;

    }

   

    // Switch to Showroom

    document.getElementById('doppl-showroom').style.display = 'block';

    document.getElementById('doppl-loading').style.display = 'flex';

    document.getElementById('doppl-final-render').style.display = 'none';

   

    window.processForensicSwap();

};



window.processForensicSwap = async () => {

    try {

        const response = await fetch('/.netlify/functions/process-vto', {

            method: 'POST',

            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })

        });

        const data = await response.json();

       

        if (data.result) {

            const renderImg = document.getElementById('doppl-final-render');

            renderImg.src = `data:image/png;base64,${data.result}`;

            document.getElementById('doppl-loading').style.display = 'none';

            renderImg.style.display = 'block';

        }

    } catch (e) {

        document.getElementById('doppl-loading').innerHTML = "<p style='color:red;'>Handshake Failed. Retry.</p>";

    }

};



// --- CART LOGIC ---

window.addToCart = () => {

    cartCount++;

    document.getElementById('cart-count').innerText = cartCount;

    const btn = document.getElementById('doppl-cart-btn');

    btn.innerText = "ADDED TO CART ✅";

    btn.style.background = "#333";

    setTimeout(() => {

        btn.innerText = "Add to cart";

        btn.style.background = "#e60023";

    }, 2000);

};



window.closeDoppl = () => { document.getElementById('doppl-showroom').style.display = 'none'; };

window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };