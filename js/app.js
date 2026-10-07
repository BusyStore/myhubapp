const WORKER_API_URL = "https://myhubapp.dathalay1.workers.dev/api/catalog";
const STREAM_BASE_URL = "https://myhubapp.dathalay1.workers.dev/stream?file_id=";

document.addEventListener("DOMContentLoaded", () => {
    fetchCatalog();
});

async function fetchCatalog() {
    try {
        const response = await fetch(WORKER_API_URL);
        const data = await response.json();

        // Header Row ကို ဖယ်ထုတ်ပြီး ဗီဒီယို Data များကို စစ်ထုတ်ခြင်း
        const videoData = data.filter(item => item.file_id && item.file_id !== "file_id");

        renderContent(videoData);
    } catch (error) {
        console.error("Error fetching catalog:", error);
    }
}

function renderContent(videoData) {
    // HTML ထဲက Container Element ကို ရှာခြင်း (အစ်ကို့ Container ID ပေါ်မူတည်၍ သုံးပေးပါ)
    const container = document.getElementById("video-container") || document.querySelector(".video-grid") || document.body;

    if (!container) return;

    container.innerHTML = "";

    if (!videoData || videoData.length === 0) {
        container.innerHTML = "<p style='color:white; padding:20px;'>No videos found.</p>";
        return;
    }

    videoData.forEach(video => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.style.cssText = "margin: 10px; padding: 10px; background: #222; color: #fff; border-radius: 8px;";

        card.innerHTML = `
            <div class="thumbnail-box" style="margin-bottom: 8px;">
                <img src="${video.thumbnail || 'https://via.placeholder.com/300x170'}" alt="${video.title}" style="width: 100%; border-radius: 4px; object-fit: cover;">
            </div>
            <div class="video-info">
                <h3 style="margin: 5px 0; font-size: 16px;">${video.title}</h3>
                <p style="margin: 5px 0; font-size: 12px; color: #aaa;">Category: ${video.category}</p>
                <button onclick="playVideo('${video.file_id}')" style="padding: 8px 12px; background: #e50914; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">Play Video</button>
            </div>
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
        // Video Player Tag မရှိပါက ပလေယာ Link ကို တိုက်ရိုက်ပွင့်စေခြင်း
        window.open(STREAM_BASE_URL + fileId, "_blank");
    }
}
