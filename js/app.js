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

// 5. Video Player Pop-up Modal (စာမျက်နှာတိုင်းတွင် Auto Player ပါဝင်စေခြင်း)
function openPlayer(streamUrl) {
    let modal = document.getElementById('videoModal');
    
    // Modal မရှိပါက Auto ဖန်တီးပေးခြင်း
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:9999; align-items:center; justify-content:center;';
        modal.innerHTML = '<div style="width:95%; max-width:850px; background:#111; position:relative; border-radius:8px; overflow:hidden;" id="modalContent"></div>';
        document.body.appendChild(modal);
    }

    let modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    modalContent.innerHTML = `
        <button onclick="closePlayer()" style="position:absolute; top:10px; right:15px; background:none; border:none; color:white; font-size:24px; cursor:pointer; z-index:10;"><i class="fa-solid fa-xmark"></i></button>
        <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay preload="auto" style="width:100%; height:450px;">
            <source src="${streamUrl}" type="application/x-mpegURL">
        </video>
    `;
    modal.style.display = 'flex';

    if (window.videojs) {
        videojs('my-video');
    }
}

// 6. Video Player ပိတ်ခြင်း
function closePlayer() {
    const modal = document.getElementById('videoModal');
    const modalContent = document.getElementById('modalContent');
    if (modal) {
        modal.style.display = 'none';
        if (modalContent) modalContent.innerHTML = '';
    }
}

document.addEventListener("DOMContentLoaded", loadDataFromWorker);
