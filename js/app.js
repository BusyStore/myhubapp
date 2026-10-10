// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

let videoData = [];
let modelData = [];
let categoryData = [];

function getDirectDriveLink(url) {
    if (!url) return '';
    const match = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

function cleanText(text) {
    if (!text) return '';
    return String(text).replace(/[\r\n]+/g, '').trim();
}

async function loadDataFromWorker() {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');
    const pageTitle = document.getElementById('pageTitle') || document.querySelector('.header-title') || document.querySelector('h2');

    if (pageTitle) {
        if (selectedModel) pageTitle.innerText = selectedModel;
        else if (selectedCategory) pageTitle.innerText = selectedCategory;
    }

    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            const validData = data.filter(item => item && typeof item === 'object');

            // ၁။ ဗီဒီယို ဒေတာများကို သီးသန့်သိမ်းဆည်းမည်
            videoData = validData.filter(item => item.file_id && cleanText(item.file_id) !== '').map(item => {
                let thumb = getDirectDriveLink(item.thumbnail);
                const rawIsVip = item.is_Vip !== undefined ? item.is_Vip : (item.is_vip !== undefined ? item.is_vip : item.isVip);

                return {
                    title: cleanText(item.title),
                    model: cleanText(item.model),
                    category: cleanText(item.category),
                    views: item.views || 0,
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    file_id: cleanText(item.file_id),
                    stream_url: item.file_id ? `${STREAM_BASE_URL}${cleanText(item.file_id)}` : '',
                    isVip: String(rawIsVip || '').toLowerCase() === 'true'
                };
            });

            // ၂. Model Page အတွက် model_name နှင့် model_image ရှိသမျှ အားလုံးကို ဇာတ်ကားရှိသည်ဖြစ်စေ၊ မရှိသည်ဖြစ်စေ သီးသန့် အပြည့်အစုံ ဆွဲထုတ်မည် (ခွေး၊ ကြောင်၊ ကြွက် ဥပမာကဲ့သို့ Master List ပုံစံ)
            const customModelMap = new Map();
            validData.forEach(item => {
                const mName = cleanText(item.model_name);
                const mImg = getDirectDriveLink(item.model_image || item.modelImage);

                if (mName && mName !== '') {
                    const key = mName.toLowerCase();
                    if (!customModelMap.has(key)) {
                        customModelMap.set(key, {
                            name: mName,
                            linkName: mName,
                            image: mImg || ''
                        });
                    } else if (mImg && !customModelMap.get(key).image) {
                        customModelMap.get(key).image = mImg;
                    }
                }
            });
            modelData = Array.from(customModelMap.values());

            // ၃. Category Page အတွက် category_name နှင့် category_image အားလုံးကို သီးသန့်ဆွဲထုတ်မည်
            const customCategoryMap = new Map();
            validData.forEach(item => {
                const cName = cleanText(item.category_name);
                const cImg = getDirectDriveLink(item.category_image || item.categoryImage);

                if (cName && cName !== '') {
                    const key = cName.toLowerCase();
                    if (!customCategoryMap.has(key)) {
                        customCategoryMap.set(key, {
                            name: cName,
                            linkName: cName,
                            image: cImg || ''
                        });
                    } else if (cImg && !customCategoryMap.get(key).image) {
                        customCategoryMap.get(key).image = cImg;
                    }
                }
            });
            categoryData = Array.from(customCategoryMap.values());

            const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
            const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
            const videoContainer = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');

            // --- Display Controller ---
            if (selectedModel || selectedCategory) {
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) categoryContainer.style.display = 'none';
                if (videoContainer) {
                    videoContainer.style.display = 'grid';
                    renderContent();
                }
            } else if (window.location.pathname.includes('model.html')) {
                if (videoContainer) videoContainer.style.display = 'none';
                if (categoryContainer) categoryContainer.style.display = 'none';
                if (modelContainer) {
                    modelContainer.style.display = 'grid';
                    renderModels();
                }
            } else if (window.location.pathname.includes('category.html')) {
                if (videoContainer) videoContainer.style.display = 'none';
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) {
                    categoryContainer.style.display = 'grid';
                    renderCategories();
                }
            } else {
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) categoryContainer.style.display = 'none';
                if (videoContainer) {
                    videoContainer.style.display = 'grid';
                    renderContent();
                }
            }
        }
    } catch (error) {
        console.error("Worker Data Fetch Error:", error);
    }
}

// Side Menu Toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    
    if (sidebar) {
        sidebar.classList.toggle('open');
        sidebar.classList.toggle('closed');
        sidebar.classList.toggle('active');
    }
    if (mainContent) {
        mainContent.classList.toggle('expanded');
    }
}

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
            <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay preload="auto" style="width:100%; height:450px;">
                <source src="${streamUrl}" type="application/x-mpegURL">
            </video>
        </div>
    `;
    modal.style.display = 'flex';

    if (window.videojs) {
        if (videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        videojs('my-video', { autoplay: true, controls: true, responsive: true, fluid: true });
    }
}

function closePlayer() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        if (window.videojs && videojs.getPlayers()['my-video']) videojs.getPlayers()['my-video'].dispose();
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}

function renderContent() {
    const container = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');
    if (!container) return;
    container.innerHTML = '';

    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');

    let displayData = videoData.filter(v => v.file_id && !v.isVip);

    // Model နှိပ်ထားပါက ဗီဒီယိုတန်းထဲက မူလ model ကော်လံ (Column B) နဲ့ တိုက်စစ်၍ Filter လုပ်မည်
    if (selectedModel) {
        displayData = displayData.filter(item => {
            if (!item.model) return false;
            const models = item.model.split(',').map(m => cleanText(m).toLowerCase());
            return models.includes(cleanText(selectedModel).toLowerCase());
        });
    }

    if (selectedCategory) {
        displayData = displayData.filter(item => {
            if (!item.category) return false;
            const cats = item.category.split(',').map(c => cleanText(c).toLowerCase());
            return cats.includes(cleanText(selectedCategory).toLowerCase());
        });
    }

    if (displayData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%;">ဗီဒီယိုများ မရှိသေးပါခင်ဗျာ။</p>';
        return;
    }

    displayData.forEach(video => {
        container.innerHTML += `
            <div class="video-card" onclick="openPlayer('${video.stream_url}')" style="cursor:pointer;">
                <div class="thumbnail-box" style="position:relative;">
                    <video src="${video.thumbnail}" autoplay loop muted playsinline style="width:100%; height:150px; object-fit:cover; pointer-events:none;"></video>
                    <span class="view-badge" style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.7); color:#fff; font-size:11px; padding:2px 6px; border-radius:4px;">
                        <i class="fa-solid fa-eye"></i> ${video.views || 0}
                    </span>
                </div>
                <div class="video-info" style="padding: 8px 10px;">
                    <h3 style="font-size: 14px; margin: 0; color: #fff; line-height: 1.3;">${video.title || ''}</h3>
                </div>
            </div>
        `;
    });
}

function renderModels() {
    const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!modelContainer) return;
    modelContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px;";
    modelContainer.innerHTML = '';

    if (!modelData || modelData.length === 0) {
        modelContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model မရှိသေးပါ။</p>';
        return;
    }

    modelData.forEach(m => {
        const displayImg = (m.image && m.image.trim() !== '') ? m.image : 'https://via.placeholder.com/150';
        modelContainer.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(m.linkName)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                    <img src="${displayImg}" alt="${m.name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                </div>
                <div style="padding:6px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</span>
                </div>
            </a>
        `;
    });
}

function renderCategories() {
    const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
    if (!categoryContainer) return;
    categoryContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; padding: 15px;";
    categoryContainer.innerHTML = '';

    if (!categoryData || categoryData.length === 0) {
        categoryContainer.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Category မရှိသေးပါ။</p>';
        return;
    }

    categoryData.forEach(cat => {
        const displayImg = (cat.image && cat.image.trim() !== '') ? cat.image : 'https://via.placeholder.com/150';
        categoryContainer.innerHTML += `
            <a href="index.html?category=${encodeURIComponent(cat.linkName)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                    <img src="${displayImg}" alt="${cat.name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                </div>
                <div style="padding:8px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cat.name}</span>
                </div>
            </a>
        `;
    });
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
