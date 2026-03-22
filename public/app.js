// --- 🎯 SIDEBAR NAVIGATOR (FIXED LOADING & CHAT SUPPORT) ---
window.openOptionsMenu = () => {
    document.getElementById('fitting-room-modal').style.display = 'flex';
    const badge = `<svg viewBox="0 0 24 24" width="14" height="14" fill="#00a2ff" style="margin-left:4px; vertical-align:middle;"><path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.79L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/></svg>`;
    
    // Sidebar drawer with forced high-contrast text for theme compatibility
    document.getElementById('ai-fitting-result').innerHTML = `
        <div id="sidebar-drawer" style="width:280px; height:100%; background:#ffffff; position:fixed; left:0; top:0; z-index:10001; padding:20px; box-shadow:2px 0 10px rgba(0,0,0,0.1); color: #111 !important; border-radius: 0;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <span onclick="window.openChatPage()" style="color:#0b57d0 !important; font-weight:700; cursor:pointer; font-size:0.9rem; display:flex; align-items:center; gap:5px;">🎧 Chat Support</span>
                <span onclick="window.closeFittingRoom()" style="font-size:1.5rem; cursor:pointer; color: #111 !important;">✕</span>
            </div>
            
            <h2 style="font-weight:900; margin:0; color:#111 !important;"><span style="color:#e60023 !important;">Mall</span> Navigator</h2>
            
            <div style="display:flex; flex-direction:column; gap:25px; margin-top:35px;">
                <div>
                    <p style="font-size:0.7rem; color:#888 !important; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; margin-bottom:12px;">Street Wears</p>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div onclick="window.location.assign('?store=ifeomaezema1791')" style="cursor:pointer; font-weight:600; color:#111 !important;">👗 Ify Fashion ${badge}</div>
                        <div onclick="window.location.assign('?store=kingss1')" style="cursor:pointer; font-weight:600; color:#111 !important;">💎 Stella Wears ${badge}</div>
                    </div>
                </div>

                <div>
                    <p style="font-size:0.7rem; color:#888 !important; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; margin-bottom:12px;">Luxury Native</p>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div onclick="window.location.assign('?store=adivichi')" style="cursor:pointer; font-weight:600; color:#111 !important;">🧵 Adivici Fashion ${badge}</div>
                        <div onclick="window.location.assign('?store=thomasmongim')" style="cursor:pointer; font-weight:600; color:#111 !important;">👕 Tommy Best ${badge}</div>
                    </div>
                </div>

                <div style="border-top:1px solid #eee; padding-top:20px;">
                    <p style="font-size:0.7rem; color:#888 !important; text-transform:uppercase; font-weight:800; letter-spacing:0.5px; margin-bottom:12px;">Unverified Stores</p>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div onclick="window.location.assign('?store=johnsonclothing')" style="cursor:pointer; font-weight:500; color:#111 !important;">🏪 Johnson Clothing Line</div>
                        <div onclick="window.location.assign('?store=johnsonsneakers')" style="cursor:pointer; font-weight:500; color:#111 !important;">🏪 Johnson Sneakers</div>
                    </div>
                </div>

                <div id="admin-sidebar-link" style="display:none; margin-top:10px; border-top:2px dashed #f5f5f5; padding-top:20px;">
                    <div onclick="window.location.href='admin.html'" style="display:flex; align-items:center; gap:10px; color:#e60023 !important; font-weight:800; cursor:pointer; background:#fff5f5; padding:12px; border-radius:12px; font-size:0.9rem;">
                        <i class="fas fa-arrow-left"></i> RETURN TO ADMIN
                    </div>
                </div>
            </div>
            
            <div style="position:absolute; bottom:20px; left:0; width:100%; text-align:center; color:#ccc !important; font-size:0.65rem; font-weight:700; letter-spacing:1px;">VIRTUALMALL © 2026</div>
        </div>`;
    
    // Check user auth to toggle the Admin button
    onAuthStateChanged(auth, (user) => {
        const link = document.getElementById('admin-sidebar-link');
        // Only show if user is logged in via Google and matches the owner email
        if (link && user && !user.isAnonymous && user.email === window.currentStoreOwnerEmail) {
            link.style.display = 'block';
        }
    });
};