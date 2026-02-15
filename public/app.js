/**
 * Kingsley Store Mall - v18.0 (SPINNER KILLER)
 * FIXED: Infinite loading, Battery drain, Search/Mic stability.
 */

// ... (clothesCatalog remains the same)

window.startMallSwap = async () => {
    document.getElementById('fitting-room-modal').style.display = 'none';
    const modal = document.getElementById('video-experience-modal');
    modal.style.display = 'flex';
    const container = document.getElementById('video-main-container');
    
    // Start Spinner
    container.innerHTML = `
        <div id="mall-loader" style="color:white;text-align:center;padding:20px;">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <p style="margin-top:15px; font-weight:bold;">Sewing your ${selectedCloth.name}...</p>
        </div>`;

    // WATCHDOG: Kill spinner after 12 seconds no matter what
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        container.innerHTML = "<p style='color:white;'>Mall is busy. Please try again with a smaller photo.</p>";
    }, 12000); 

    try {
        const response = await fetch('/.netlify/functions/process-vto', {
            method: 'POST',
            signal: controller.signal, // Connect watchdog
            body: JSON.stringify({ userImage: userPhoto.split(',')[1], cloth: selectedCloth.name })
        });
        
        clearTimeout(timeoutId); // AI finished in time, stop the watchdog
        const data = await response.json();
        
        if (data.result) {
            container.innerHTML = `<img src="data:image/png;base64,${data.result}" style="width:100%; border-radius:20px; display:block;">`;
            document.getElementById('video-bottom-section').innerHTML = `<button onclick="location.reload()" class="primary-btn" style="background:#28a745; color:white; width:280px; margin-top:20px;">Rock Another Fit 🔄</button>`;
        }
    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            container.innerHTML = "<p style='color:white;'>Connection timed out. Use a smaller image.</p>";
        } else {
            container.innerHTML = "<p style='color:white;'>Error swapping cloth. Check API Key.</p>";
        }
    }
};