/**
 * Kingsley Mall - v20.0 (THE KILL-SWITCH EDITION)
 * GOAL: No more infinite loading. 
 */

window.startSwapNow = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const modal = document.getElementById('video-experience-modal');
    modal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // 1. Reset and Show Spinner
    container.innerHTML = `
        <div id="loading-box" style="color:white;text-align:center;padding:20px;">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <p style="margin-top:15px;">Sewing your ${selectedCloth.name}...</p>
        </div>`;

    // 2. WATCHDOG: If no response in 15s, kill the spinner manually
    const watchdog = setTimeout(() => {
        container.innerHTML = `
            <div style="color:#ff4444;text-align:center;padding:20px;">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <p>AI is taking too long. Check your internet or Netlify logs.</p>
                <button onclick="location.reload()" style="background:white; color:black; padding:10px; border-radius:8px; border:none; margin-top:10px;">Retry</button>
            </div>`;
    }, 15000);

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            body: JSON.stringify({ 
                userImage: userPhoto.split(',')[1], 
                cloth: selectedCloth.name 
            })
        });

        const data = await response.json();
        clearTimeout(watchdog); // Stop the watchdog because we got an answer

        if (data.result) {
            // SUCCESS: Show the wearing photo
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">`;
            document.getElementById('video-bottom-section').innerHTML = `
                <button onclick="window.addToCart()" class="primary-btn" style="background:#28a745; color:white; width:280px; margin-top:20px; border:none; padding:15px; border-radius:12px; font-weight:bold;">Add to Cart 🛒</button>
            `;
        } else {
            throw new Error("Empty AI result");
        }
    } catch (e) {
        clearTimeout(watchdog);
        container.innerHTML = `<p style='color:white; text-align:center;'>Swap failed. Try a smaller/clearer photo.</p>`;
    }
};