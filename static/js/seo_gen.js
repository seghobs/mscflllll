window.videoStates = window.videoStates || {};

async function generateSEO(retryTitle, retryLyrics) {
    const btn = document.getElementById('seoBtn');
    const loading = document.getElementById('seoLoading');
    const seoForms = document.getElementById('seoForms');

    btn.disabled = true; btn.classList.add('opacity-50');
    loading.classList.remove('hidden');
    seoForms.classList.add('hidden');

    const title = retryTitle || document.getElementById('modalSongName').textContent;
    const lyrics = retryLyrics !== undefined ? retryLyrics : (knownSongs[videoSongId] ? knownSongs[videoSongId].lyrics || '' : '');

    if(!window.videoStates[videoSongId]) window.videoStates[videoSongId] = {};
    if(!window.videoStates[videoSongId].seo) window.videoStates[videoSongId].seo = { title:'', desc:'', tags:'' };

    const st = window.videoStates[videoSongId].seo;

    try {
        if(!st.title) {
            loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>1/3 Başlık üretiliyor...</span>';
            if(activeVideoTaskId) updateTaskPhase(activeVideoTaskId, '1/3 📝 Başlık üretiliyor');
            const d1 = await seoFetch('/api/seo-title', {title, lyrics}, loading, title, lyrics);
            st.title = d1.result;
        }

        if(!st.desc) {
            loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>2/3 Açıklama üretiliyor...</span>';
            if(activeVideoTaskId) updateTaskPhase(activeVideoTaskId, '2/3 📝 Açıklama üretiliyor');
            const d2 = await seoFetch('/api/seo-description', {title, lyrics}, loading, title, lyrics);
            st.desc = d2.result;
        }

        if(!st.tags) {
            loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>3/3 Etiketler üretiliyor...</span>';
            if(activeVideoTaskId) updateTaskPhase(activeVideoTaskId, '3/3 🏷️ Etiketler üretiliyor');
            const d3 = await seoFetch('/api/seo-tags', {title, lyrics}, loading, title, lyrics);
            st.tags = d3.result;
        }

        document.getElementById('ytUploadTitle').value = st.title;
        document.getElementById('ytUploadDesc').value = st.desc;
        document.getElementById('ytUploadTags').value = st.tags;

        loading.classList.add('hidden');
        btn.disabled = false; btn.classList.remove('opacity-50');
        seoForms.classList.remove('hidden');
        btn.classList.add('hidden');
        if(typeof saveVideoState === 'function') saveVideoState(videoSongId, { seo: st });
    } catch (e) {
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
}

// Track input changes in SEO fields to save to draft
function updateSeoDraft() {
    if(!window.videoStates || !window.videoStates[videoSongId]) return;
    if(!window.videoStates[videoSongId].seo) window.videoStates[videoSongId].seo = {};
    const st = window.videoStates[videoSongId].seo;
    st.title = document.getElementById('ytUploadTitle').value;
    st.desc = document.getElementById('ytUploadDesc').value;
    st.tags = document.getElementById('ytUploadTags').value;
    if(typeof saveVideoState === 'function') saveVideoState(videoSongId, { seo: st });
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ytUploadTitle').addEventListener('input', updateSeoDraft);
    document.getElementById('ytUploadDesc').addEventListener('input', updateSeoDraft);
    document.getElementById('ytUploadTags').addEventListener('input', updateSeoDraft);
});

async function seoFetch(url, body, loadingEl, songTitle, songLyrics) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await resp.json();
        if(!data.ok) throw new Error(data.error || 'Hata');
        return data;
    } catch(e) {
        clearTimeout(timeout);
        const msg = e.name === 'AbortError' ? 'Zaman aşımı (120sn)' : e.message;
        loadingEl.innerHTML = `
            <div class="text-center">
                <i class="fa-solid fa-xmark text-red-400 text-lg mb-2"></i>
                <div class="text-xs text-red-400 mb-2">${msg}</div>
                <button onclick="generateSEO('${songTitle.replace(/'/g,"\\'").replace(/"/g,"&quot;")}','${(songLyrics||'').replace(/'/g,"\\'").replace(/\r?\n/g,"\\n").replace(/"/g,"&quot;").substring(0,200)}')"
                    class="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all">
                    <i class="fa-solid fa-rotate-right mr-1"></i> Tekrar Dene
                </button>
            </div>`;
        throw e;
    }
}
async function uploadToYouTube() {
    const btn = document.getElementById('ytUploadBtn');
    const title = document.getElementById('ytUploadTitle').value.trim();
    const desc = document.getElementById('ytUploadDesc').value.trim();
    const tags = document.getElementById('ytUploadTags').value.trim();
    
    if(!title) return alert("Lütfen video başlığını girin.");
    if(!activeVideoIdForUpload) return alert("Video ID bulunamadı, lütfen sayfayı yenileyip tekrar deneyin.");
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor... Lütfen bekleyin!';
    btn.classList.add('opacity-80');
    
    try {
        const resp = await fetch('/api/youtube-upload', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                video_id: activeVideoIdForUpload,
                title: title,
                description: desc,
                tags: tags
            })
        });
        const data = await resp.json();
        
        if (data.ok) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Başarıyla Yüklendi!';
            btn.classList.replace('from-red-600', 'from-green-600');
            btn.classList.replace('to-red-500', 'to-green-500');
            if(data.yt_url) {
                const link = document.createElement('a');
                link.href = data.yt_url;
                link.target = '_blank';
                link.className = 'mt-2 text-sm text-blue-400 underline block text-center';
                link.innerHTML = '<i class="fa-brands fa-youtube mr-1"></i>YouTube\'da Görüntüle →';
                btn.parentElement.appendChild(link);
            }
            if(typeof removeDraftState === 'function') removeDraftState(videoSongId);
        } else {
            alert("Hata: " + (data.error || "Bilinmeyen hata"));
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-brands fa-youtube text-lg"></i> YouTube Kanalıma Yükle';
            btn.classList.remove('opacity-80');
        }
    } catch(e) {
        alert("Hata: " + e.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-brands fa-youtube text-lg"></i> YouTube Kanalıma Yükle';
        btn.classList.remove('opacity-80');
    }
}