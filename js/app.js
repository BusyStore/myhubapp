// ==========================================
// MY HUB - APP LOGIC & VIP ROUTING
// ==========================================

// WORKER BACKEND CONFIGURATION
const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

// Global Data Stores
let videoData = [];
let categoryData = [];
let modelData = [];

// 1. Google Sheet မှ Data များကို Worker API မှတစ်ဆင့် Auto Fetch လုပ်ခြင်း
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
            categoryData = categories.map(cat => ({ name: cat, image: '' }));

            const models = [...new Set(data.map(item => item.model).filter(Boolean))];
            modelData = models.map(m => ({ name: m, image: '' }));

            if (typeof renderContent === 'function') {
                renderContent();
            }
            if (typeof handleSearch === 'function') {
                handleSearch();
            }
        }
    } catch (error) {
        console.error("Worker Data Fetch Error:", error);
    }
}

// 2. Side Menu ဖွင့်/ပိတ် (Toggle)
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

// 3. User Login စစ်ဆေးခြင်း
function isLoggedIn() {
    return localStorage.getItem("isLoggedIn") === "true";
}

// 4. VIP Zone စစ်ဆေးခြင်း
function checkVipAccess() {
    if (isLoggedIn()) {
        window.location.href = "vip.html";
    } else {
        alert("VIP သို့ ဝင်ရောက်ရန် Account အရင်ပြုလုပ်ပေးပါခင်ဗျာ။");
        window.location.href = "login.html";
    }
}

// 5. Video Player Pop-up Modal (Video.js - Speed Control & Double Tap 10s Skip ပါဝင်သော Player)
function openPlayer(streamUrl) {
    let modal = document.getElementById('videoModal');
    
    // Modal မရှိပါက Auto ဖန်တီးပေးခြင်း
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:9999; align-items:center; justify-content:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div id="modalContent" style="position:relative; width:95%; max-width:850px; background:#111; border-radius:8px; overflow:hidden;">
            <button onclick="closePlayer()" style="position:absolute; top:10px; right:15px; background:rgba(0,0,0,0.6); border:none; color:white; font-size:24px; cursor:pointer; z-index:10000; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-xmark"></i></button>
            
            <!-- Skip Indicator Overlay (Double Tap ရိုက်စဉ် 10s + / 10s - စာသားပြရန်) -->
            <div id="skipOverlay" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:20px; font-weight:bold; background:rgba(0,0,0,0.75); padding:10px 20px; border-radius:25px; display:none; pointer-events:none; z-index:9999;"></div>

            <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay preload="auto" style="width:100%; height:450px;">
                <source src="${streamUrl}" type="application/x-mpegURL">
            </video>
        </div>
    `;

    modal.style.display = 'flex';

    if (window.videojs) {
        // ယခင် Player သီးသန့်ရှိနေပါက ဖျက်မည်
        if (videojs.getPlayers()['my-video']) {
            videojs.getPlayers()['my-video'].dispose();
        }

        const player = videojs('my-video', {
            autoplay: true,
            controls: true,
            responsive: true,
            fluid: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2], // Video Playback Speed ပြောင်းရန် (0.5x မှ 2x)
            userActions: {
                hotkeys: true // Keyboard Arrow Keys ဖြင့် ရှေ့/နောက် ကျော်ရန်
            }
        });

        // --- Double Tap Gesture Logic (10 Seconds Fast Forward & Rewind) ---
        player.ready(function() {
            const videoElement = player.el();
            let lastTapTime = 0;
            let tapTimeout;

            videoElement.addEventListener('touchstart', function(e) {
                // Control Bar နှိပ်တာဆိုရင် Gesture မလုပ်ပါ
                if (e.target.closest('.vjs-control-bar')) return;

                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                clearTimeout(tapTimeout);

                // Double Tap စစ်ဆေးခြင်း (300ms အတွင်း ၂ ချက်နှိပ်ပါက)
                if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault();
                    const rect = videoElement.getBoundingClientRect();
                    const touchX = e.touches[0].clientX - rect.left;
                    const playerWidth = rect.width;

                    if (touchX < playerWidth / 2) {
                        // ဘယ်ဘက်ခြမ်းကို ၂ ချက်နှိပ်ပါက - ၁၀ စက္ကန့် နောက်ဆုတ်မည်
                        player.currentTime(Math.max(0, player.currentTime() - 10));
                        showSkipText("<<Rewind");
                    } else {
                        // ညာဘက်ခြမ်းကို ၂ ချက်နှိပ်ပါက - ၁၀ စက္ကန့် ရှေ့ကျော်မည်
                        player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                        showSkipText("Forward >>");
                    }
                }
                lastTapTime = currentTime;
            });

            // 10s Indicator ခဏ ပေါ်စေမည့် Function
            function showSkipText(text) {
                const overlay = document.getElementById('skipOverlay');
                if (overlay) {
                    overlay.innerText = text;
                    overlay.style.display = 'block';
                    setTimeout(() => {
                        overlay.style.display = 'none';
                    }, 800);
                }
            }
        });
    }
}

// 6. Video Player ပိတ်ခြင်း
function closePlayer() {
    const modal = document.getElementById('videoModal');
    if (modal) {
        if (window.videojs && videojs.getPlayers()['my-video']) {
            videojs.getPlayers()['my-video'].dispose();
        }
        modal.style.display = 'none';
        modal.innerHTML = '';
    }
}
// URL Search Params မှ Model သို့မဟုတ် Category ကို ဖတ်၍ Video များ စစ်ထုတ်ပြသခြင်း
function renderContent() {
    const container = document.getElementById('videoContainer');
    if (!container) return;

    container.innerHTML = '';

    const urlParams = new URLSearchParams(window.location.search);
    const selectedModel = urlParams.get('model');
    const selectedCategory = urlParams.get('category');
    const isPopular = urlParams.get('sort') === 'popular';

    let displayData = videoData.filter(v => !v.isVip);

}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
