// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

// Global Data Stores
let videoData = [];
let categoryData = [];
let modelData = [];

// 1. Fetch Data
async function loadDataFromWorker() {
    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            videoData = data.map(item => ({
                title: item.title || '',
                category: item.category || '',
                model: item.model || '',
                thumbnail: item.thumbnail || 'https://via.placeholder.com/300x180',
                stream_url: `${STREAM_BASE_URL}${item.file_id}`,
                isVip: item.isVip === 'true' || item.isVip === true,
                views: item.views || 0,
                tags: [item.category, item.model].filter(Boolean)
            }));

            const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
            categoryData = categories.map(cat => ({ name: cat }));

            const models = [...new Set(data.map(item => item.model).filter(Boolean))];
            modelData = models.map(m => ({ name: m }));

            if (typeof renderContent === 'function') renderContent();
            if (typeof renderModels === 'function') renderModels();
            if (typeof handleSearch === 'function') handleSearch();
        }
    } catch (error) {
        console.error("Worker Data Fetch Error:", error);
    }
}

// 2. Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.getElementById('mainContent');
    if (window.innerWidth > 768) {
        if (sidebar) sidebar.classList.toggle('closed');
        if (mainContent) mainContent.classList.toggle('expanded');
    } else {
        if (sidebar) sidebar.classList.toggle('open');
    }
}

// 3. Open Video Player
function openPlayer(streamUrl) {
    let modal = document.getElementById('videoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:9999; align-items:center; justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div id="modalContent" style="position:relative; width:95%; max-width:850px; background:#111; border-radius:8px; overflow:hidden;">
            <button onclick="closePlayer()" style="position:absolute; top:10px; right:15px; background:rgba(0,0,0,0.6); border:none; color:white; font-size:24px; cursor:pointer; z-index:10000; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-xmark"></i></button>
            <div id="skipOverlay" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:13px; font-weight:600; background:rgba(0,0,0,0.75); padding:6px 14px; border-radius:20px; display:none; pointer-events:none; z-index:9999; backdrop-filter:blur(4px);"></div>
            <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay preload="auto" style="width:100%; height:450px;">
                <source src="${streamUrl}" type="application/x-mpegURL">
            </video>
        </div>
    `;

    modal.style.display = 'flex';

    if (window.videojs) {
        if (videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        const player = videojs('my-video', {
            autoplay: true, controls: true, responsive: true, fluid: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2]
        });

        player.ready(function() {
            const videoElement = player.el();
            let lastTapTime = 0;
            videoElement.addEventListener('touchstart', function(e) {
                if (e.target.closest('.vjs-control-bar')) return;
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault();
                    const rect = videoElement.getBoundingClientRect();
                    const touchX = e.touches[0].clientX - rect.left;
                    if (touchX < rect.width / 2) {
                        player.currentTime(Math.max(0, player.currentTime() - 10));
                        showSkipText("◄◄ 10s");
                    } else {
                        player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                        showSkipText("10s ►►");
                    }
                }
                lastTapTime = currentTime;
            });

            function showSkipText(text) {
                const overlay = document.getElementById('skipOverlay');
                if (overlay) {
                    overlay.innerText = text;
                    overlay.style.display = 'block';
                    setTimeout(() => overlay.style.display = 'none', 800);
                }
            }
        });
    }
}

// 4. Close Player
function closePlayer() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        if (window.videojs && videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

// 5. Render Video Content
function renderContent() {
    const container = document.getElementById('videoContainer');
    if (!container) return;

    container.innerHTML = '';
    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');
    const isPopular = urlParams.get('sort') === 'popular';

    let displayData = videoData.filter(v => !v.isVip);

    if (selectedModel) {
        displayData = displayData.filter(item => item.model && item.model.trim().toLowerCase() === selectedModel.trim().toLowerCase());
    }
    if (selectedCategory) {
        displayData = displayData.filter(item => item.category && item.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());
    }
    if (isPopular) {
        displayData.sort((a, b) => (b.views || 0) - (a.views || 0));
    }

    if (displayData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%;">ဗီဒီယိုများ မရှိသေးပါခင်ဗျာ။</p>';
        return;
    }

    displayData.forEach(video => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${video.stream_url}')">
                <div class="thumbnail-box" style="position:relative;">
                    <img src="${video.thumbnail}" alt="${video.title}" style="width:100%; border-radius:8px;">
                    <span class="view-badge" style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.7); color:#fff; padding:2px 6px; border-radius:4px; font-size:12px;">
                        <i class="fa-solid fa-eye"></i> ${video.views || 0}
                    </span>
                </div>
                <div class="video-info" style="padding:8px 0;">
                    <h3 style="font-size:14px; margin:0; color:#fff;">${video.title}</h3>
                </div>
            </div>
        `;
    });
}

// 6. Render Model List
function renderModels() {
    const modelContainer = document.getElementById('modelContainer');
    if (!modelContainer) return;

    if (modelData.length === 0) {
        modelContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model များ မရှိသေးပါခင်ဗျာ။</p>';
        return;
    }

    modelContainer.innerHTML = modelData.map(m => `
        <a href="index.html?model=${encodeURIComponent(m.name)}" class="model-card" style="display:inline-block; margin:6px; padding:10px 18px; background:#222; color:#fff; border-radius:20px; text-decoration:none; font-size:14px; border:1px solid #333;">
            <i class="fa-solid fa-user"></i> ${m.name}
        </a>
    `).join('');
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
