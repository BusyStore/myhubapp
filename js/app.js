// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

let videoData = [];

function getDirectDriveLink(url) {
    if (!url) return '';
    const strUrl = String(url).trim();
    if (strUrl.includes('drive.google.com') || strUrl.includes('docs.google.com')) {
        const match = strUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
    }
    return strUrl;
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

            // ဗီဒီယို ဒေတာများ သိမ်းဆည်းမည်
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

            const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
            const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
            const videoContainer = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');

            // Display Controller & Render
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
                    renderModelsDirect(validData); // Model များကို တိုက်ရိုက်ထုတ်ပြမည်
                }
            } else if (window.location.pathname.includes('category.html')) {
                if (videoContainer) videoContainer.style.display = 'none';
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) {
                    categoryContainer.style.display = 'grid';
                    renderCategoriesDirect(validData); // Category များကို တိုက်ရိုက်ထုတ်ပြမည်
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

// Model များကို Sheet ထဲက model_name အတိုင်း တိုက်ရိုက်ဆွဲထုတ်ပြရန်
function renderModelsDirect(data) {
    const container = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!container) return;

    container.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px;";
    container.innerHTML = '';

    let count = 0;
    data.forEach(item => {
        if (item && item.model_name) {
            let name = cleanText(item.model_name);
            let image = getDirectDriveLink(item.model_image || item.modelImage);

            if (name !== '') {
                count++;
                const displayImg = image !== '' ? image : 'https://via.placeholder.com/150';
                container.innerHTML += `
                    <a href="model.html?model=${encodeURIComponent(name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                        <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                            <img src="${displayImg}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                        </div>
                        <div style="padding:6px 4px;">
                            <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                        </div>
                    </a>
                `;
            }
        }
    });

    if (count === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Model မရှိသေးပါ။</p>';
    }
}

// Category များကို category_name အတိုင်း တိုက်ရိုက်ဆွဲထုတ်ပြရန်
function renderCategoriesDirect(data) {
    const container = document.getElementById('categoryContainer') || document.getElementById('category-container');
    if (!container) return;

    container.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; padding: 15px;";
    container.innerHTML = '';

    let count = 0;
    data.forEach(item => {
        if (item && item.category_name) {
            let name = cleanText(item.category_name);
            let image = getDirectDriveLink(item.category_image || item.categoryImage);

            if (name !== '') {
                count++;
                const displayImg = image !== '' ? image : 'https://via.placeholder.com/150';
                container.innerHTML += `
                    <a href="index.html?category=${encodeURIComponent(name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                        <div style="width:100%; height:135px; overflow:hidden; background:#000;">
                            <img src="${displayImg}" alt="${name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                        </div>
                        <div style="padding:8px 4px;">
                            <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                        </div>
                    </a>
                `;
            }
        }
    });

    if (count === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; width:100%;">Category မရှိသေးပါ။</p>';
    }
}

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

    let displayData = videoData.filter(v => v.file_id && v.file_id.trim() !== '' && !v.isVip);

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
            <div class="video-card" onclick="openPlayer('${video.file_id}', '${video.stream_url}')" style="cursor:pointer; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; display:flex; flex-direction:column;">
                <div class="thumbnail-box" style="position:relative; width:100%; height:150px; background:#000; overflow:hidden;">
                    <video src="${video.thumbnail}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover; pointer-events:none; display:block; position:absolute; top:0; left:0;"></video>
                    <span class="view-badge" style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.7); color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; z-index:2;">
                        <i class="fa-solid fa-eye"></i> ${video.views || 0}
                    </span>
                </div>
                <div class="video-info" style="padding: 8px 10px;">
                    <h3 style="font-size: 14px; margin: 0; color: #fff; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title || ''}</h3>
                </div>
            </div>
        `;
    });

}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
