const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

let videoData = [];
let modelData = [];
let categoryData = [];

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

            // ၁။ ဗီဒီယို ဒေတာများ သိမ်းဆည်းခြင်း
            videoData = validData.filter(item => item.file_id && cleanText(item.file_id) !== '').map(item => {
                let thumb = getDirectDriveLink(item.thumbnail);
                const rawIsVip = item.is_Vip !== undefined ? item.is_Vip : (item.is_vip !== undefined ? item.is_vip : item.isVip);

                return {
                    title: cleanText(item.title),
                    model: cleanText(item.model),
                    model_name: cleanText(item.model_name),
                    category: cleanText(item.category),
                    category_name: cleanText(item.category_name),
                    views: item.views || 0,
                    thumbnail: thumb || 'https://via.placeholder.com/300x180',
                    file_id: cleanText(item.file_id),
                    stream_url: item.file_id ? `${STREAM_BASE_URL}${cleanText(item.file_id)}` : '',
                    isVip: String(rawIsVip || '').toLowerCase() === 'true'
                };
            });

            // ၂။ Model ဒေတာများ စုဆောင်းခြင်း
            const modelMap = new Map();
            validData.forEach(item => {
                let rawModels = cleanText(item.model_name || item.model);
                let img = getDirectDriveLink(item.model_image || item.modelImage);
                let hasVideo = item.file_id && cleanText(item.file_id) !== '';
                if (rawModels !== '') {
                    let models = rawModels.split(',').map(m => cleanText(m)).filter(m => m !== '');
                    models.forEach(name => {
                        let lowerName = name.toLowerCase();
                        if (!modelMap.has(lowerName)) {
                            modelMap.set(lowerName, { name: name, image: img, count: 0 });
                        } else if (img && !modelMap.get(lowerName).image) {
                            modelMap.get(lowerName).image = img;
                        }
                        if (hasVideo) modelMap.get(lowerName).count++;
                    });
                }
            });
            modelData = Array.from(modelMap.values());

            // ၃။ Category များကို category_name မှ ယူမည်၊ Count ကိုမူ item.category ထဲပါသော စာသားများဖြင့် တွက်မည်
            const catMap = new Map();

            // ပထမအဆင့် - category_name ကော်လံမှ နာမည်များနှင့် ပုံများကို အဓိကယူမည်
            validData.forEach(item => {
                let catNameField = cleanText(item.category_name);
                let img = getDirectDriveLink(item.category_image || item.categoryImage);

                if (catNameField !== '') {
                    // category_name မှာ တစ်ကွက်ချင်းစီ သို့မဟုတ် ကော်မာခံနိုင်လျှင် ခွဲမည်
                    let cats = catNameField.split(',').map(c => cleanText(c)).filter(c => c !== '');
                    cats.forEach(name => {
                        let lowerName = name.toLowerCase();
                        if (!catMap.has(lowerName)) {
                            catMap.set(lowerName, { name: name, image: img, count: 0 });
                        } else if (img && !catMap.get(lowerName).image) {
                            catMap.get(lowerName).image = img;
                        }
                    });
                }
            });

            // ဒုတိယအဆင့် - ဗီဒီယို တစ်ပုဒ်ချင်းစီ၏ item.category ကော်လံ (ကော်မာပါသော) ထဲမှ စစ်ပြီး Count ကို တိကျစွာ ပေါင်းထည့်မည်
            videoData.forEach(video => {
                if (video.category) {
                    let videoCats = video.category.split(',').map(c => cleanText(c).toLowerCase()).filter(c => c !== '');
                    videoCats.forEach(lowerCatName => {
                        if (catMap.has(lowerCatName)) {
                            catMap.get(lowerCatName).count++;
                        }
                    });
                }
            });

            categoryData = Array.from(catMap.values());

            const modelContainer = document.getElementById('modelContainer') || document.getElementById('model-container');
            const categoryContainer = document.getElementById('categoryContainer') || document.getElementById('category-container');
            const videoContainer = document.getElementById('videoContainer') || document.getElementById('video-container') || document.querySelector('.video-grid');

            // Page အလိုက် ခွဲခြားပြသခြင်း
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
                    renderModelsDirect();
                }
            } else if (window.location.pathname.includes('category.html')) {
                if (videoContainer) videoContainer.style.display = 'none';
                if (modelContainer) modelContainer.style.display = 'none';
                if (categoryContainer) {
                    categoryContainer.style.display = 'grid';
                    renderCategoriesDirect();
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

// Model များကို ပြသရန်
function renderModelsDirect() {
    const container = document.getElementById('modelContainer') || document.getElementById('model-container');
    if (!container) return;

    container.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px;";
    container.innerHTML = '';

    if (modelData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%; grid-column: 1 / -1;">Model မရှိသေးပါ။</p>';
        return;
    }

    modelData.forEach(model => {
        const displayImg = (model.image && model.image !== '') ? model.image : 'https://via.placeholder.com/150';
        container.innerHTML += `
            <a href="model.html?model=${encodeURIComponent(model.name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000; position:relative;">
                    <img src="${displayImg}" alt="${model.name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                    <span style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:2px 5px; border-radius:4px;">${model.count} vids</span>
                </div>
                <div style="padding:6px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${model.name}</span>
                </div>
            </a>
        `;
    });
}

// Category များကို ပြသရန် (vids count ဖြုတ်ချင်ရင် အောက်က ${cat.count} vids နေရာကို ဖြုတ်လို့ရပါတယ်)
function renderCategoriesDirect() {
    const container = document.getElementById('categoryContainer') || document.getElementById('category-container');
    if (!container) return;

    container.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; padding: 15px;";
    container.innerHTML = '';

    if (categoryData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:40px; width:100%; grid-column: 1 / -1;">Category မရှိသေးပါ။</p>';
        return;
    }

    categoryData.forEach(cat => {
        const displayImg = (cat.image && cat.image !== '') ? cat.image : 'https://via.placeholder.com/150';
        container.innerHTML += `
            <a href="index.html?category=${encodeURIComponent(cat.name)}" style="display:block; text-decoration:none; background:#1a1a24; border-radius:10px; overflow:hidden; border:1px solid #282836; text-align:center;">
                <div style="width:100%; height:135px; overflow:hidden; background:#000; position:relative;">
                    <img src="${displayImg}" alt="${cat.name}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/150';">
                    <span style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:2px 5px; border-radius:4px;">${cat.count} vids</span>
                </div>
                <div style="padding:8px 4px;">
                    <span style="font-size:12px; font-weight:600; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cat.name}</span>
                </div>
            </a>
        `;
    });
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

// ဗီဒီယိုဖွင့်ပြီး Views ကို 93 တိုးစေရန်
function openPlayer(fileId, streamUrl) {
    if (!streamUrl) return;

    if (fileId) {
        fetch(WORKER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileId })
        }).catch(err => console.error("View increment error:", err));
    }

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

// ဗီဒီယိုများကို စစ်ထုတ်ပြသရန်
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
            const targetModel = item.model ? item.model : item.model_name;
            if (!targetModel) return false;
            const models = targetModel.split(',').map(m => cleanText(m).toLowerCase());
            return models.includes(cleanText(selectedModel).toLowerCase());
        });
    }

    if (selectedCategory) {
        displayData = displayData.filter(item => {
            const targetCat = item.category ? item.category : item.category_name;
            if (!targetCat) return false;
            const cats = targetCat.split(',').map(c => cleanText(c).toLowerCase());
            return cats.includes(cleanText(selectedCategory).toLowerCase());
        });
    }

    if (displayData.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; padding:60px 20px; width:100%; display:flex; justify-content:center; align-items:center; grid-column: 1 / -1;">No Videos for this Content</p>';
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
