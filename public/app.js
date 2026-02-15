/**
 * Kingsley Store AI - Core Logic v7.4 (COMPLETE)
 * RESTORED: Greetings, Large Mic, Profile Persistence.
 * FIXED: Doppl Grounded Showroom modeling reveal.
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

let gIndex = 0; let userPhoto = ""; let cartCount = 0; let selectedCloth = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Profile Logic
    const saved = localStorage.getItem('kingsley_profile_locked');
    if (saved) { document.getElementById('owner-img').src = saved; userPhoto = saved; }
    
    // 2. Greetings Loop
    setInterval(() => {
        const el = document.getElementById('dynamic-greeting');
        if (el) { el.innerText = greetings[gIndex % greetings.length]; gIndex++; }
    }, 2000);

    // 3. Mic Logic (Restored Size)
    if ('webkitSpeechRecognition' in window) {
        const rec = new webkitSpeechRecognition();
        const micBtn = document.getElementById('mic-btn');
        micBtn.onclick = () => { rec.start(); micBtn.style.color = "red"; };
        rec.onresult = (e) => {
            document.getElementById('ai-input').value = e.results[0][0].transcript;
            micBtn.style.color = "#1a1a1a";
            window.executeSearch();
        };
    }
});

window.handleProfileUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = event.target.result;
        document.getElementById('owner-img').src = img;
        localStorage.setItem('kingsley_profile_locked', img);
        userPhoto = img;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.clearProfileData = () => { localStorage.removeItem('kingsley_profile_locked'); location.reload(); };

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    if (!input.trim()) return;
    const matched = clothesCatalog.filter(i => i.name.toLowerCase().includes(input) || i.tags.toLowerCase().includes(input));
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(i => `
            <div class="result-card" onclick="window.initiateDoppl(${i.id})" style="background:#f2f2f2; border-radius:12px; padding:15px; text-align:center; cursor:pointer;">
                <img src="images/${i.img}" style="width:100%; height:150px; object-fit:contain; border-radius:8px;">
                <h4 style="margin:10px 0 5px;">${i.name}</h4><p style="color:#e60023; font-weight:800; margin:0;">${i.price}</p>
            </div>
        `).join('');
    }
};

window.initiateDoppl = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    if (!userPhoto) { alert("Please upload your profile photo first!"); return; }
    document.getElementById('doppl-showroom').style.display = 'block';
    document.getElementById('doppl-loading').style.display = 'flex';
    document.getElementById('doppl-final-render').style.display = 'none';
    window.processModelingSwap();
};

window.processModelingSwap = async () => {
    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        const data = await response.json();
        if (data.result) {
            const render = document.getElementById('doppl-final-render');
            render.src = `data:image/png;base64,${data.result}`;
            render.onload = () => {
                document.getElementById('doppl-loading').style.display = 'none';
                render.style.display = 'block';
            };
        }
    } catch (e) { document.getElementById('doppl-loading').innerHTML = "<p>Server Busy. Retry.</p>"; }
};

window.addToCart = () => {
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    const btn = document.getElementById('doppl-cart-btn');
    btn.innerText = "ADDED TO CART ✅";
    setTimeout(() => btn.innerText = "Add to cart", 2000);
};

window.closeDoppl = () => { document.getElementById('doppl-showroom').style.display = 'none'; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };