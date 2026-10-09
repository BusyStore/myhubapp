// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

// Global Data Stores (မူရင်း ၃ ခုလုံး ပြန်လည် ထည့်သွင်းထားပါသည်)
let videoData = [];
let modelData = [];
let categoryData = [];

// Google Drive Link ကို Direct Link ပြောင်းပေးသည့် Function
function getDirectDriveLink(url) {
    if (!url) return '';
    const match = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

// 1. Fetch Data From Worker
async function loadDataFromWorker() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');
    const pageTitle = document.getElementById('pageTitle') || document.querySelector('.header-title') || document.querySelector('h2');

    if (pageTitle) {
        if (selectedModel) {
            pageTitle.innerText = selectedModel;
        } else if (selectedCategory) {
            pageTitle.innerText = selectedCategory;
        }
    }

    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            const validData = data.filter(item => item && typeof item === 'object');

            // 1. Process Video Data
            videoData = validData.map(item => {
                const normalized = {};
                Object.keys(item).forEach(key => {
                    normalized[key.trim().toLowerCase()] = item[key];
                });

                let thumb = getDirectDriveLink(normalized['thumbnail']);
                let mImg = getDirectDriveLink(normalized['model_image'] || normalized['modelimage']);
                let cImg = getDirectDriveLink(normalized['category_image'] || normalized['categoryimage']);

                const rawIsVip = normalized['is_vip'] !== undefined ? normalized['is_vip'] : normalized['isvip'];

                return {
                    title: normalized['title'] || '',
                    model: normalized['model'] || '',
                    category: normalized['category'] || '',
                    views: normalized['views'] || 0,
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    file_id: normalized['file_id'] || '',
                    stream_url: normalized['file_id'] ? `${STREAM_BASE_URL}${normalized['file_id']}` : '',
                    isVip: String(rawIsVip || '').toLowerCase() === 'true',
                    model_name: normalized['model_name'] || '',
                    model_image: mImg,
                    category_name: normalized['category_name'] || '',
                    category_image: cImg
                };
            });

            // 2. Process Model Data into modelData Global Store
            const modelMap = new Map();
            videoData.forEach(item => {
                if (item.model_name && item.model_name.trim() !== '') {
                    const m = item.model_name.trim();
                    const key = m.toLowerCase();
                    if (!modelMap.has(key)) {
                        const img = (item.model_image && item.model_image.trim() !== '') ? item.model_image : (item.thumbnail || 'https://via.placeholder.com/150');
                        modelMap.set(key, { name: m, image: img });
                    }
                }
                if (item.model) {
                    const models = item.model.split(',').map(m => m.trim());
                    models.forEach(m => {
                        if (m) {
                            const key = m.toLowerCase();
                            if (!modelMap.has(key)) {
                                const img = (item.model_image && item.model_image.trim() !== '') ? item.model_image : (item.thumbnail || 'https://via.placeholder.com/150');
                                modelMap.set(key, { name: m, image: img });
                            }
                        }
                    });
                }
            });
            modelData = Array.from(modelMap.values());

            // 3. Process Category Data into categoryData Global Store
            const catMap = new Map();
            videoData.forEach(item => {
                if (item.category_name && item.category_name.trim() !== '') {
                    const c = item.category_name.trim();
                    const key = c.toLowerCase();
                    if (!catMap.has(key)) {
                        const img = (item.category_image && item.category_image.trim() !== '') ? item.category_image : (item.thumbnail || 'https://via.placeholder.com/150');
                        catMap.set(key, { name: c, image: img });
                    }
                }
                if (item.category) {
                    const cats = item.category.split(',').map(c => c.trim());
                    cats.forEach(c => {
                        if (c) {
                            const key = c.toLowerCase();
                            if (!catMap.has(key)) {
                                const img = (item.category_image && item.category_image.trim() !== '') ? item.category_image : (item.thumbnail || 'https://via.placeholder.com/150');
                                catMap.set(key, { name: c, image: img });
                            }
                        }
                    });
                }
            });
            categoryData = Array.from(catMap.values());

            // Render Containers
            const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
            const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
            const videoContainer = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');

            if (videoContainer) {
                videoContainer.style.display = 'grid';
                renderContent();
            }

            if (modelContainer) {
                if (selectedModel) {
                    modelContainer.style.display = 'none';
                } else {
                    modelContainer.style.display = 'grid';
                    if (videoContainer) videoContainer.style.display = 'none';
                    renderModels();
                }
            }

            if (categoryContainer) {
                if (selectedCategory) {
                    categoryContainer.style.display = 'none';
                } else {
                    categoryContainer.style.display = 'grid';
                    if (videoContainer) videoContainer.style.display = 'none';
                    renderCategories();
                }
            }
        }
    } catch (error) {
        console.error("Worker Data Fetch Error:", error);
    }
}

// 2. Toggle Sidebar (Side Menu ဖွင့်/ပိတ်)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    if (sidebar) {
        if (window.innerWidth > 768) {
            sidebar.classList.toggle('closed');
            if (mainContent) mainContent.classList.toggle('expanded');
        } else {
            sidebar.classList.toggle('open');
        }
    }
}

// 3. Open Video Player Modal
function openPlayer(streamUrl) {
    if (!streamUrl) return;
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
                    setTimeout(() =>
                        
