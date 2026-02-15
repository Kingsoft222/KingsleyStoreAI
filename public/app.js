const clothesCatalog = [{ id: 1, name: "Premium Red Senator", tags: "senator red native", img: "senator_red.jpg", price: "₦25k" }];
const greetings = ["Nne, what are you looking for today?", "My guy, what are you looking for today?", "Classic Babe, what are you looking for today?", "Boss, what are you looking for today?", "Classic Man, what are you looking for today?", "Chief, looking for premium native?", "Baddie, let's find your style!"];

let gIndex = 0; let userPhoto = ""; let selectedCloth = null; let cartCount = 0;

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
            micBtn.style.color = "#1a1a1a";
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

window.executeSearch = () => {
    const input = document.getElementById('ai-input').value.toLowerCase();
    const results = document.getElementById('ai-results');
    const matched = clothesCatalog.filter(i => i.name.toLowerCase().includes(input));
    if (matched.length > 0) {
        results.style.display = 'grid';
        results.innerHTML = matched.map(item => `
            <div class="result-card" onclick="window.promptShowroomChoice(${item.id})" style="background:#f2f2f2; border-radius:15px; padding:12px; text-align:center; cursor:pointer;">
                <img src="images/${item.img}" style="width:100%; height:160px; object-fit:contain;">
                <h4>${item.name}</h4><p style="color:#e60023; font-weight:800;">${item.price}</p>
            </div>
        `).join('');
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.promptShowroomChoice = (id) => {
    selectedCloth = clothesCatalog.find(c => c.id === id);
    document.getElementById('fitting-room-modal').style.display = 'flex';
    document.getElementById('ai-fitting-result').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; align-items:center; width:100%;">
            <button onclick="window.initiateUploadFlow('photo')" class="primary-btn" style="background:#e60023; color:white; padding:15px; border-radius:10px;">📸 See how you look (photo)</button>
            <button onclick="window.initiateUploadFlow('video')" class="primary-btn" style="background:#333; color:white; padding:15px; border-radius:10px;">🎥 See how you look (video)</button>
        </div>
    `;
};

window.initiateUploadFlow = (mode) => {
    document.getElementById('ai-fitting-result').innerHTML = "";
    const btn = document.getElementById('fit-action-btn');
    btn.style.display = 'block';
    btn.innerText = "Upload Your Photo";
    btn.onclick = () => document.getElementById('user-fit-input').click();
};

window.handleUserFitUpload = (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        userPhoto = event.target.result;
        const btn = document.getElementById('fit-action-btn');
        btn.innerText = "Model My Look";
        btn.style.background = "#28a745";
        btn.onclick = window.startModeling;
    };
    reader.readAsDataURL(e.target.files[0]);
};

window.startModeling = () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    document.getElementById('doppl-showroom').style.display = 'block';
    document.getElementById('doppl-loading').style.display = 'flex';
    document.getElementById('doppl-final-render').style.display = 'none';
    window.triggerAISwap();
};

window.triggerAISwap = async () => {
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
    } catch (e) { document.getElementById('doppl-loading').innerHTML = "<p>AI Busy. Retry.</p>"; }
};

window.addToCart = () => { cartCount++; document.getElementById('cart-count').innerText = cartCount; };
window.closeFittingRoom = () => { document.getElementById('fitting-room-modal').style.display = 'none'; };
window.closeDoppl = () => { document.getElementById('doppl-showroom').style.display = 'none'; };
window.quickSearch = (q) => { document.getElementById('ai-input').value = q; window.executeSearch(); };
window.clearProfileData = () => { localStorage.removeItem('kingsley_profile_locked'); location.reload(); };