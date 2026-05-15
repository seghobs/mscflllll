/* ===== YOUTUBE VIDEOS SIDEBAR ===== */
let ytVideosData = [];
let ytSidebarLoaded = false;

function toggleYtVideosSidebar() {
    const sidebar = document.getElementById('ytVideosSidebar');
    if(!sidebar) return;
    const isHidden = sidebar.classList.contains('-translate-x-[calc(100%+1rem)]');
    
    // İşlem Kuyruğu açıksa kapat
    const queueSidebar = document.getElementById('queueSidebar');
    if (isHidden && queueSidebar && !queueSidebar.classList.contains('-translate-x-[calc(100%+1rem)]')) {
        if (typeof toggleQueuePanel === 'function') toggleQueuePanel();
    }
    
    // Taslaklar açıksa kapat
    const draftsPanel = document.getElementById('draftsPanel');
    if (isHidden && draftsPanel && !draftsPanel.classList.contains('-translate-x-[calc(100%+1rem)]')) {
        if (typeof toggleDraftsPanel === 'function') toggleDraftsPanel();
    }

    if(isHidden) {
        sidebar.classList.remove('-translate-x-[calc(100%+1rem)]');
        sidebar.classList.add('translate-x-0');
        if(!ytSidebarLoaded) loadYtVideos();
    } else {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-[calc(100%+1rem)]');
    }
}

async function loadYtVideos() {
    const container = document.getElementById('ytVideosList');
    container.innerHTML = '<div class="flex items-center justify-center py-8"><i class="fa-solid fa-spinner fa-spin text-dark-500 mr-2"></i><span class="text-dark-500 text-sm">Videolar yükleniyor...</span></div>';

    try {
        const resp = await fetch('/api/yt-videos');
        const data = await resp.json();

        if(!data.ok) {
            container.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-triangle-exclamation text-2xl text-red-400 mb-2"></i><p class="text-red-400 text-sm">${data.error || 'Videolar yüklenemedi'}</p></div>`;
            return;
        }

        if(!data.videos || !data.videos.length) {
            container.innerHTML = '<div class="text-center py-8"><i class="fa-regular fa-folder-open text-3xl text-dark-600 mb-2"></i><p class="text-dark-500 text-sm">Kanalda video bulunamadı</p></div>';
            return;
        }

        ytVideosData = data.videos;
        ytSidebarLoaded = true;
        filterYtVideos('views_desc');
    } catch(e) {
        container.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-triangle-exclamation text-2xl text-red-400 mb-2"></i><p class="text-red-400 text-sm">${e.message}</p></div>`;
    }
}

function filterYtVideos(filter) {
    document.querySelectorAll('.yt-filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filter);
    });

    let sorted = [...ytVideosData];
    switch(filter) {
        case 'views_desc': sorted.sort((a,b) => (b.viewCount||0) - (a.viewCount||0)); break;
        case 'views_asc': sorted.sort((a,b) => (a.viewCount||0) - (b.viewCount||0)); break;
        case 'date_desc': sorted.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt)); break;
        case 'date_asc': sorted.sort((a,b) => new Date(a.publishedAt) - new Date(b.publishedAt)); break;
    }

    renderYtVideos(sorted);
}

function renderYtVideos(videos) {
    const container = document.getElementById('ytVideosList');
    container.innerHTML = '';
    videos.forEach((v,i) => {
        const views = v.viewCount ? Number(v.viewCount).toLocaleString('tr-TR') : '0';
        const likes = v.likeCount ? Number(v.likeCount).toLocaleString('tr-TR') : '-';
        const date = v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('tr-TR') : '';
        const safeTitle = (v.title||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
        container.innerHTML += `
            <div class="yt-video-card fade-in" style="animation-delay:${i*0.04}s">
                <div onclick="window.open('https://www.youtube.com/watch?v=${v.videoId}','_blank')" style="cursor:pointer">
                    <img class="yt-video-thumb" src="${v.thumbnail || ''}" alt="" loading="lazy">
                    <div class="yt-video-title">${v.title || 'Başlıksız'}</div>
                    <div class="yt-video-meta">
                        <span class="yt-video-views"><i class="fa-solid fa-eye"></i> ${views}</span>
                        <span class="yt-video-views"><i class="fa-solid fa-thumbs-up"></i> ${likes}</span>
                        ${date ? `<span class="yt-video-date"><i class="fa-regular fa-calendar"></i> ${date}</span>` : ''}
                    </div>
                </div>
                <button onclick="event.stopPropagation(); optimizeVideoSEO('${v.videoId}','${safeTitle}','yt-seo-${v.videoId}')" class="w-full mt-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Bu Video İçin Viral SEO Önerisi Al
                </button>
                <div id="yt-seo-${v.videoId}" class="hidden mt-2"></div>
            </div>
        `;
    });
}

/* ===== YOUTUBE URL PASTE HANDLER ===== */
document.addEventListener('DOMContentLoaded', () => {
    const ytUrlInput = document.getElementById('ytUrl');
    if (ytUrlInput) {
        let timeout;
        ytUrlInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const val = e.target.value.trim();
                if (val.includes('youtube.com/watch?v=') || val.includes('youtu.be/')) {
                    openYtActionModal();
                }
            }, 300);
        });
    }
});

function openYtActionModal() {
    const modal = document.getElementById('ytActionModal');
    if(!modal) return;
    
    // Reset state to initial
    document.getElementById('ytActionStateSelect').classList.remove('hidden');
    document.getElementById('ytActionStatePlaying').classList.add('hidden');
    
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('visible'), 10);
}

function closeYtActionModal() {
    const modal = document.getElementById('ytActionModal');
    if(!modal) return;
    modal.classList.remove('visible');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function ytActionProcess() {
    closeYtActionModal();
    downloadYoutube();
}

async function ytActionListen() {
    const url = document.getElementById('ytUrl').value.trim();
    const btn = document.querySelector('#ytActionStateSelect [onclick="ytActionListen()"]');
    const originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
    
    try {
        const resp = await fetch(`/api/yt-info?url=${encodeURIComponent(url)}`);
        const data = await resp.json();
        
        if (data.title) {
            if(typeof playYtVideo === 'function') {
                playYtVideo(data.id, data.title);
            }
            
            // Switch to playing state instead of closing
            document.getElementById('ytActionStateSelect').classList.add('hidden');
            document.getElementById('ytActionStatePlaying').classList.remove('hidden');
        } else {
            let videoId = '';
            if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
            if(videoId && typeof playYtVideo === 'function') {
                playYtVideo(videoId, 'YouTube Önizleme');
                document.getElementById('ytActionStateSelect').classList.add('hidden');
                document.getElementById('ytActionStatePlaying').classList.remove('hidden');
            } else {
                closeYtActionModal();
            }
        }
    } catch (e) {
        console.error('Info error:', e);
        closeYtActionModal();
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}