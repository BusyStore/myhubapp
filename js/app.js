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
        const videoData = data.filter(item => item.file_id && item.file_id !== "file_id").map(item => {
    let modelImg = item.model_image || '';
    if (modelImg.includes('drive.google.com/file/d/')) {
        const fileId = modelImg.split('/file/d/')[1].split('/')[0];
        modelImg = `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return { ...item, model_image: modelImg };
});


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

const uniqueModels = [...new Set(videoData.map(item => item.model).filter(Boolean))];
const modelData = uniqueModels.map(m => {
    const found = videoData.find(v => v.model && v.model.trim().toLowerCase() === m.trim().toLowerCase());
    return { name: m, image: (found && found.model_image) ? found.model_image : 'https://via.placeholder.com/150' };
});
if (document.getElementById("modelContainer")) renderModels(modelData);


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
function renderModels(models) {
    const container = document.getElementById("modelContainer");
    if (!container) return;
    container.innerHTML = "";
    models.forEach(m => {
        const card = document.createElement("a");
        card.href = `index.html?model=${encodeURIComponent(m.name)}`;
        card.style.cssText = "display: inline-block; margin: 10px; text-decoration: none; text-align: center; color: #fff;";
        card.innerHTML = `
            <div style="width: 120px; height: 120px; border-radius: 50%; overflow: hidden; border: 2px solid #e50914; margin: 0 auto 8px auto;">
                <img src="${m.image}" alt="${m.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <span style="font-size: 14px; font-weight: bold;">${m.name}</span>
        `;
        container.appendChild(card);
    });
}
