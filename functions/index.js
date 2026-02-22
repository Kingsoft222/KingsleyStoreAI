<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Kingsley Store | AI Virtual Try-On</title>
    <link rel="stylesheet" href="./style.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
</head>
<body>
    <header class="app-header">
        <button class="menu-btn" style="background:none; border:none; font-size:1.5rem; color:var(--text-main); cursor:pointer;">☰</button>
        <div class="cart-icon" style="font-size:1.2rem; cursor:pointer; color:var(--text-main);">🛒<span id="cart-count" style="font-size:0.8rem; background:var(--accent); color:white; padding:2px 6px; border-radius:50%; margin-left:5px;">0</span></div>
    </header>

    <main class="home-container">
        <div class="store-profile">
            <div class="profile-pic-container">
                <div class="profile-pic" onclick="document.getElementById('profile-input').click()">
                    <img src="images/kingsley.jpg" id="owner-img" alt="Profile" />
                </div>
                <button class="mini-remove-btn" onclick="window.clearProfileData()">-</button>
            </div>
            <input type="file" id="profile-input" hidden accept="image/*" onchange="window.handleProfileUpload(event)" />
            
            <h1 class="store-name">Kingsley Store</h1>
            <p id="dynamic-greeting" class="greeting">Nne, what are you looking for today?</p>
        </div>

        <div id="ai-results" class="results-grid"></div>
    </main>

    <div id="fitting-room-modal" class="voice-overlay">
        <div class="voice-modal">
            <span onclick="window.closeFittingRoom()" style="position:absolute; right:20px; top:15px; cursor:pointer; font-size:28px; font-weight: 800; color: var(--text-main);">×</span>
            <div id="ai-fitting-result" style="width: 100%;"></div>
        </div>
    </div>

    <footer class="bottom-controls">
        <div class="split-cards">
            <div class="chip spaced-card" onclick="window.quickSearch('Dinner outfit')">
                <strong>Dinner outfit</strong>
            </div>
            <div class="chip spaced-card" onclick="window.quickSearch('jeans')">
                <strong>Jeans</strong>
            </div>
        </div>
        
        <div class="search-bar">
            <input type="text" id="ai-input" placeholder="Search Senator or Ankara..." />
            <div class="input-icons">
                <i class="fas fa-microphone mic-icon" id="mic-btn"></i>
                <button class="send-circle" onclick="window.executeSearch()">
                    <svg viewBox="0 0 24 24" style="width:20px;"><path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white"/></svg>
                </button>
            </div>
        </div>
    </footer>

    <script src="./app.js" type="module"></script>
</body>
</html>