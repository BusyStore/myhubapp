// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

// Global Data Stores
let videoData = [];
let modelData = [];

// Google Drive Link ကို Direct Link ပြောင်းပေးသည့် Function
function getDirectDriveLink(url) {
    if (!url) return '';
    const match = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

// 1. Fetch Data From Worker (Header စာလုံးကြီး/သေး နှင့် Space လွဲမှုများကို အလိုအလျောက် ညှိပေးသည်)
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

            videoData = validData.map(item => {
                // Key များကို စာလုံးသေးပြောင်းပြီး Space ဖြုတ်ရန် Helper Map
                const normalizedItem = {};
                Object.keys(item).forEach(key => {
                    normalizedItem[key.trim().toLowerCase()] = item[key];
                });

                let thumb = getDirectDriveLink(normalizedItem['thumbnail']);
                let mImg = getDirectDriveLink(normalizedItem['model_image'] || normalizedItem['modelimage']);
                let cImg = getDirectDriveLink(normalizedItem['category_image'] || normalizedItem['categoryimage']);

                const rawIsVip = normalizedItem['is_vip'] !== undefined ? normalizedItem['is_vip'] : normalizedItem['isvip'];

                return {
                    title: normalizedItem['title'] || '',
                    model: normalizedItem['model'] || '',
                    category: normalizedItem['category'] || '',
                    views: normalizedItem['views'] || 0,
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    file_id: normalizedItem['file_id'] || '',
                    stream_url: normalizedItem['file_id'] ? `${STREAM_BASE_URL}${normalizedItem['file_id']}` : '',
                    isVip: String(rawIsVip || '').toLowerCase() === 'true',
                    // Custom Mapping Columns
                    model_name: normalizedItem['model_name'] || '',
                    model_image: mImg,
                    category_name: normalizedItem['category_name'] || '',
                    category_image: cImg
                };
            });

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

// 5. Render Videos List
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

    let displayData = videoData.filter(v => v.file_id && v.file_id.trim() !== '' && !v.isVip);

    if (selectedModel) {
        displayData = displayData.filter(item => {
            if (!item.model) return false;
            const models = item.model.split(',').map(m => m.trim().toLowerCase());
            return models.includes(selectedModel.trim().toLowerCase());
        });
    }

    if (selectedCategory) {
        displayData = displayData.filter(item => {
            if (!item.category) return false;
            const cats = item.category.split(',').map(c => c.trim().toLowerCase());
            return cats.includes(selectedCategory.trim().toLowerCase());
        });
    }

    if (displayData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%;">ဗီဒီယိုများ မရှိသေးပါခင်ဗျာ။</p>';
        return;
    }

    displayData.forEach(video => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${video.stream_url}')">
                <div class="thumbnail-box">
                    <video src="${video.thumbnail}" 
                           autoplay 
                           loop 
                           muted 
                           playsinline 
                           style="pointer-events: none;">
                    </video>
                    <span class="view-badge">
                        <i class="fa-solid fa-eye"></i> ${video.views || 0}
                    </span>
                </div>
                <div class="video-info" style="padding: 8px 10px;">
                    <h3 style="font-size: 14px; margin: 0; color: #fff; line-height: 1.3;">${video.title || ''}</h3>
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.thumbnail-box video').forEach(v => {
        v.muted = true;
        v.play().catch(e => console.log(e));
    });
}

// 6. Render Models List
function renderModels() {
    const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!modelContainer) return;

    modelContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px;";
    modelContainer.innerHTML = '';

    const customModelImageMap = new Map();
    videoData.forEach(item => {
        const mName = item.model_name;
        const mImg = item.model_image;
        if (mName && mName.trim() !== '') {
            customModelImageMap.set(mName.trim().toLowerCase(), mImg);
        }
    });

    const modelMap = new Map();
    videoData.forEach(item => {
        const rawModel = item.model || item.model_name;
        if (rawModel) {
            const models = rawModel.split(',').map(m => m.trim());
            models.forEach(m => {
                if (m) {
                    const key = m.toLowerCase();
                    if (!modelMap.has(key)) {
                        const customImg = customModelImageMap.get(key);
                        const finalImg = (customImg && customImg.trim() !== '') ? customImg : (item.thumbnail || 'https://via.placeholder.com/150');
                        modelMap.set(key, { name: m, image: finalImg });
                    }
                }
            });
        }
    });

    const uniqueModels = Array.from(modelMap.values());

    if (uniqueModels.length === 0) {
        modelContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model မရှိသေးပါ။</p>';
        return;
    }

    uniqueModels.forEach(m => {
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

// 7. Render Categories List
function renderCategories() {
    const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
    if (!categoryContainer) return;

    categoryContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; padding: 15px;";
    categoryContainer.innerHTML = '';

    const customCategoryImageMap = new Map();
    videoData.forEach(item => {
        const cName = item.category_name;
        const cImg = item.category_image;
        if (cName && cName.trim() !== '') {
            customCategoryImageMap.set(cName.trim().toLowerCase(), cImg);
        }
    });

    const catMap = new Map();
    videoData.forEach(item => {
        const rawCategory = item.category || item.category_name;
        if (rawCategory) {
            const cats = rawCategory.split(',').map(c => c.trim());
            cats.forEach(c => {
                if (c) {
                    const key = c.toLowerCase();
                    if (!catMap.has(key)) {
                        const customImg = customCategoryImageMap.get(key);
                        const finalImg = (customImg && customImg.trim() !== '') ? customImg : (item.thumbnail || 'https://via.placeholder.com/150');
                        catMap.set(key, { name: c, image: finalImg });
                    }
                }
            });
        }
    });

    const uniqueCategories = Array.from(catMap.values());

    if (uniqueCategories.length === 0) {
        categoryContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Category မရှိသေးပါ။</p>';
        return;
    }

    uniqueCategories.forEach(cat => {
        const displayImg = (cat.image && cat.image.trim() !== '') ? cat.image : 'https://via.placeholder.com/150';

        categoryContainer.innerHTML += `
            <a href="index.html?category=${encodeURIComponent(cat.name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                    <img src="${displayImg}" alt="${cat.name}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:0; border:none;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                </div>
                <div style="padding:8px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cat.name}</span>
                </div>
            </a>
        `;
    });
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
>
                    <video src="${video.thumbnail}" 
                           autoplay 
                           loop 
                           muted 
                           playsinline 
                           style="pointer-events: none;">
                    </video>
                    <span class="view-badge">
                        <i class="fa-solid fa-eye"></i> ${video.views || 0}
                    </span>
                </div>
                <div class="video-info" style="padding: 8px 10px;">
                    <h3 style="font-size: 14px; margin: 0; color: #fff; line-height: 1.3;">${video.title || ''}</h3>
                </div>
            </div>
        `;
    });

    document.querySelectorAll('.thumbnail-box video').forEach(v => {
        v.muted = true;
        v.play().catch(e => console.log(e));
    });
}

// 6. Render Models List
function renderModels() {
    const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!modelContainer) return;

    modelContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px;";
    modelContainer.innerHTML = '';

    const customModelImageMap = new Map();
    videoData.forEach(item => {
        const mName = item.model_name;
        const mImg = item.model_image;
        if (mName && mName.trim() !== '') {
            customModelImageMap.set(mName.trim().toLowerCase(), mImg);
        }
    });

    const modelMap = new Map();
    videoData.forEach(item => {
        const rawModel = item.model || item.model_name;
        if (rawModel) {
            const models = rawModel.split(',').map(m => m.trim());
            models.forEach(m => {
                if (m) {
                    const key = m.toLowerCase();
                    if (!modelMap.has(key)) {
                        const customImg = customModelImageMap.get(key);
                        const finalImg = (customImg && customImg.trim() !== '') ? customImg : (item.thumbnail || 'https://via.placeholder.com/150');
                        modelMap.set(key, { name: m, image: finalImg });
                    }
                }
            });
        }
    });

    const uniqueModels = Array.from(modelMap.values());

    if (uniqueModels.length === 0) {
        modelContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model မရှိသေးပါ။</p>';
        return;
    }

    uniqueModels.forEach(m => {
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

// 7. Render Categories List
function renderCategories() {
    const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
    if (!categoryContainer) return;

    categoryContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; padding: 15px;";
    categoryContainer.innerHTML = '';

    const customCategoryImageMap = new Map();
    videoData.forEach(item => {
        const cName = item.category_name;
        const cImg = item.category_image;
        if (cName && cName.trim() !== '') {
            customCategoryImageMap.set(cName.trim().toLowerCase(), cImg);
        }
    });

    const catMap = new Map();
    videoData.forEach(item => {
        const rawCategory = item.category || item.category_name;
        if (rawCategory) {
            const cats = rawCategory.split(',').map(c => c.trim());
            cats.forEach(c => {
                if (c) {
                    const key = c.toLowerCase();
                    if (!catMap.has(key)) {
                        const customImg = customCategoryImageMap.get(key);
                        const finalImg = (customImg && customImg.trim() !== '') ? customImg : (item.thumbnail || 'https://via.placeholder.com/150');
                        catMap.set(key, { name: c, image: finalImg });
                    }
                }
            });
        }
    });

    const uniqueCategories = Array.from(catMap.values());

    if (uniqueCategories.length === 0) {
        categoryContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Category မရှိသေးပါ။</p>';
        return;
    }

    uniqueCategories.forEach(cat => {
        const displayImg = (cat.image && cat.image.trim() !== '') ? cat.image : 'https://via.placeholder.com/150';

        categoryContainer.innerHTML += `
            <a href="index.html?category=${encodeURIComponent(cat.name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                    <img src="${displayImg}" alt="${cat.name}" style="width:100%; height:100%; object-fit:cover; display:block; border-radius:0; border:none;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                </div>
                <div style="padding:8px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cat.name}</span>
                </div>
            </a>
        `;
    });
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
                                                                                                                                                             
