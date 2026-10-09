// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

// Global Data Stores
let videoData = [];
let categoryData = [];
let modelData = [];

// Google Drive Link ကို Direct Link ပြောင်းပေးသည့် Function
function getDirectDriveLink(url) {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        const fileId = match[1];
        return `https://lh3.googleusercontent.com/d/${fileId}`;
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
            const validData = data.filter(item => item && item.file_id && item.file_id !== "file_id");

            videoData = validData.map(item => {
                let thumb = item.thumbnail || '';
                if (thumb.includes('drive.google.com/file/d/')) {
                    const fileId = thumb.split('/file/d/')[1].split('/')[0];
                    thumb = `https://lh3.googleusercontent.com/d/${fileId}`;
                }

                let modelImg = item.model_image || '';
                if (modelImg.includes('drive.google.com/file/d/')) {
                    const fileId = modelImg.split('/file/d/')[1].split('/')[0];
                    modelImg = `https://lh3.googleusercontent.com/d/${fileId}`;
                }

                return {
                    title: item.title || '',
                    category: item.category || '',
                    model: item.model || item.Model || '',
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    model_image: modelImg || thumb || 'https://via.placeholder.com/150',
                    stream_url: `${STREAM_BASE_URL}${item.file_id}`,
                    file_id: item.file_id,
                    isVip: String(item.isVip).toLowerCase() === 'true',
                    views: item.views || 0
                };
            });

            const uniqueModels = [...new Set(videoData.map(item => item.model).filter(Boolean))];
            modelData = uniqueModels.map(m => {
                const found = videoData.find(v => v.model && v.model.trim().toLowerCase() === m.trim().toLowerCase());
                return {
                    name: m,
                    image: found ? found.model_image : 'https://via.placeholder.com/150'
                };
            });

            const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
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

// 3. Open Video Player Modal
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

// 5. Render Videos
function renderContent() {
    const container = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');
    if (!container) return;

    container.innerHTML = '';

    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');

    const pageTitle = document.getElementById('pageTitle') || document.querySelector('.header-title') || document.querySelector('h2');
    if (pageTitle) {
        if (selectedModel) {
            pageTitle.innerText = selectedModel;
        } else if (selectedCategory) {
            pageTitle.innerText = selectedCategory;
        } else {
            pageTitle.innerText = "Latest Videos";
        }
    }

    let displayData = videoData.filter(v => !v.isVip);

    if (selectedModel) {
        displayData = displayData.filter(item => item.model && item.model.trim().toLowerCase() === selectedModel.trim().toLowerCase());
    }
    if (selectedCategory) {
        displayData = displayData.filter(item => item.category && item.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());
t-align:center; padding:40px; width:100%;">ဗီဒီယိုများ မရှိသေးပါခင်ဗျာ။</p>';
        return;
    }

   displayData.forEach(video => {
    container.innerHTML += `
        <div class="video-card" onclick="openPlayer('${video.stream_url}')" style="box-sizing: border-box; width: 100%; border-radius: 8px; overflow: hidden; background: #1a1a1a; margin-bottom: 12px;">
            <!-- Thumbnail & Video Box -->
            <div class="thumbnail-box" style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <video src="${video.thumbnail}" 
                       autoplay 
                       loop 
                       muted 
                       playsinline 
                       style="width: 100%; height: 100%; object-fit: cover; display: block; margin: 0; padding: 0; pointer-events: none;">
                </video>
                <span class="view-badge" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px; z-index: 2;">
                    <i class="fa-solid fa-eye"></i> ${video.views || 0}
                </span>
            </div>
            <!-- Title Box -->
            <div class="video-info" style="padding: 8px 10px;">
                <h3 style="font-size: 14px; margin: 0; color: #fff; line-height: 1.3;">${video.title || ''}</h3>
            </div>
        </div>
    `;
});

// Autoplay ကို Force Run လုပ်ခြင်း
document.querySelectorAll('.thumbnail-box video').forEach(v => {
    v.muted = true;
    v.play().catch(e => console.log(e));
});


// 6. Render Model List (Image Cards)
function renderModels() {
    const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!modelContainer) return;

    modelContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px;";
    modelContainer.innerHTML = '';

    if (!modelData || modelData.length === 0) {
        modelContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model များ မရှိသေးပါခင်ဗျာ။</p>';
        return;
    }

    const uniqueModels = [];
    const modelMap = new Map();

    modelData.forEach(item => {
        // Field Name မျိုးစုံကို စစ်ထုတ်ပေးထားပါသည်
        const name = item.model || item.Model || item.name || item.Title;
        const img = item.model_image || item['model_image'] || item.modelImage || item.image || item.thumbnail || item.Thumbnail;

        if (name && !modelMap.has(name)) {
            modelMap.set(name, true);
            uniqueModels.push({ name: name, image: img });
        }
    });

    if (uniqueModels.length === 0) {
        modelContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model Data မတွေ့ပါခင်ဗျာ။</p>';
        return;
    }

    uniqueModels.forEach(m => {
        // ပုံ မရှိရင် သို့မဟုတ် Error တက်ရင် အစားထိုးပြမည့် ပုံ
        const displayImg = (m.image && m.image.trim() !== '') ? m.image : 'https://via.placeholder.com/150';

        modelContainer.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(m.name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                    <img src="${displayImg}" alt="${m.name}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:0; border:none;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                </div>
                <div style="padding:6px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</span>
                </div>
            </a>
        `;
    });
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
