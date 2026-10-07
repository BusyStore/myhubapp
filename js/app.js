const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

document.addEventListener("DOMContentLoaded", () => {
    fetchCatalog();
});

async function fetchCatalog() {
    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        if (!Array.isArray(data)) return;

        // Header Row ကို ဖယ်ထုတ်ခြင်း
        const videoData = data.filter(item => item && item.file_id && item.file_id !== "file_id");

        // ဗီဒီယိုများ ပြသခြင်း
        renderContent(videoData);

        // မော်ဒယ်များ ပြသခြင်း (modelContainer ရှိပါက)
        renderModels(videoData);

    } catch (error) {
        console.error("Error fetching catalog:", error);
    }
}

function renderContent(videoData) {
    const container = document.getElementById("video-container") || document.querySelector(".video-grid");
    if (!container) return;

    container.innerHTML = "";

    if (!videoData || videoData.length === 0) {
        container.innerHTML = "<p style='color:white; padding:20px;'>No videos found.</p>";
        return;
    }

    videoData.forEach(video => {
        let thumb = video.thumbnail || '';
        if (thumb.includes('drive.google.com/file/d/')) {
            const fileId = thumb.split('/file/d/')[1].split('/')[0];
            thumb = `https://lh3.googleusercontent.com/d/${fileId}`;
        }

        const card = document.createElement("div");
        card.className = "video-card";
        card.style.cssText = "margin: 10px; padding: 10px; background: #222; color: #fff; border-radius: 8px;";

        card.innerHTML = `
            <div class="thumbnail-box" style="margin-bottom: 8px;">
                <img src="${thumb || 'https://via.placeholder.com/300x170'}" alt="${video.title || ''}" style="width: 100%; border-radius: 4px; object-fit: cover;">
            </div>
            <div class="video-info">
                <h3 style="margin: 5px 0; font-size: 16px;">${video.title || ''}</h3>
                <p style="margin: 5px 0; font-size: 12px; color: #aaa;">Category: ${video.category || ''}</p>
                <button onclick="playVideo('${video.file_id}')" style="padding: 8px 12px; background: #e50914; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">Play Video</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderModels(videoData) {
    const container = document.getElementById("modelContainer") || document.getElementById("model-container");
    if (!container) return;

    container.innerHTML = "";

    // Model နာမည်များကို သီးသန့် ထုတ်ယူခြင်း
    const uniqueModels = [...new Set(videoData.map(item => item.model).filter(Boolean))];

    uniqueModels.forEach(mName => {
        const found = videoData.find(v => v.model && v.model.trim().toLowerCase() === mName.trim().toLowerCase());
        
        let mImg = found ? (found.model_image || found.thumbnail || '') : '';
        if (mImg.includes('drive.google.com/file/d/')) {
            const fileId = mImg.split('/file/d/')[1].split('/')[0];
            mImg = `https://lh3.googleusercontent.com/d/${fileId}`;
        }

        const card = document.createElement("a");
        card.href = `index.html?model=${encodeURIComponent(mName)}`;
        card.style.cssText = "display: inline-block; margin: 10px; text-decoration: none; text-align: center; color: #fff;";
        card.innerHTML = `
            <div style="width: 110px; height: 110px; border-radius: 50%; overflow: hidden; border: 2px solid #e50914; margin: 0 auto 8px auto; background: #333;">
                <img src="${mImg || 'https://via.placeholder.com/110'}" alt="${mName}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <span style="font-size: 14px; font-weight: bold; color: #fff;">${mName}</span>
        `;
        container.appendChild(card);
    });
}

function playVideo(fileId) {
    const videoPlayer = document.getElementById("main-player");
    if (videoPlayer) {
        videoPlayer.src = STREAM_BASE_URL + fileId;
        videoPlayer.play();
    } else {
        window.open(STREAM_BASE_URL + fileId, "_blank");
    }
}
