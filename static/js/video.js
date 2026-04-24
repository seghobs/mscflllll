window.videoStates = window.videoStates || {};

function saveVideoState(songId, data) {
    if(!window.videoStates) window.videoStates = {};
    window.videoStates[songId] = { ...(window.videoStates[songId] || {}), ...data };
    if(typeof saveDraftState === 'function') {
        saveDraftState(songId, { 
            title: document.getElementById('modalSongName').textContent || songId, 
            type: 'video', 
            videoState: window.videoStates[songId] 
        });
    }
}

function openVideoModal(songId, title) {
    videoSongId = songId;
    document.getElementById('modalSongName').textContent = title || songId;
    document.getElementById('videoModal').classList.remove('hidden');

    document.getElementById('videoStep1').classList.remove('hidden');
    document.getElementById('videoStep2').classList.add('hidden');
    document.getElementById('videoStep3').classList.add('hidden');
    document.getElementById('videoError').classList.add('hidden');
    document.getElementById('imgPreviewWrapper').classList.add('hidden');
    document.getElementById('aiGenerating').classList.add('hidden');
    document.getElementById('seoForms').classList.add('hidden');
    document.getElementById('seoBtn').classList.remove('hidden');
    document.getElementById('imgDropContent').classList.remove('hidden');
    document.getElementById('imgInfo').classList.add('hidden');
    document.getElementById('createVideoBtn').disabled = true;
    document.getElementById('imgInput').value = '';
    selectedAiCover = null;
    activeVideoIdForUpload = null;

    const st = window.videoStates[songId];
    if (st) {
        if (st.step === 3) {
            document.getElementById('videoStep1').classList.add('hidden');
            document.getElementById('videoStep3').classList.remove('hidden');
            document.getElementById('videoDownloadLink').href = st.download_url;
            activeVideoIdForUpload = st.video_id;

            if (st.seo) {
                document.getElementById('ytUploadTitle').value = st.seo.title || '';
                document.getElementById('ytUploadDesc').value = st.seo.desc || '';
                document.getElementById('ytUploadTags').value = st.seo.tags || '';
                if (st.seo.title || st.seo.desc || st.seo.tags) {
                    document.getElementById('seoForms').classList.remove('hidden');
                    document.getElementById('seoBtn').classList.add('hidden');
                }
            }
            return;
        } else if (st.step === 2) {
            document.getElementById('videoStep1').classList.add('hidden');
            document.getElementById('videoStep2').classList.remove('hidden');
            activeVideoTaskId = st.task_id;
            return;
        } else if (st.coverUrl && st.coverFile) {
            selectedAiCover = st.coverFile;
            document.getElementById('imgPreview').src = st.coverUrl;
            document.getElementById('imgPreviewWrapper').classList.remove('hidden');
            document.getElementById('imgDropContent').classList.add('hidden');
            document.getElementById('createVideoBtn').disabled = false;
        }
    }
}
function closeVideoModal() { document.getElementById('videoModal').classList.add('hidden'); }
function setupImgDrop() {
    const dz = document.getElementById('imgDropzone');
    const fi = document.getElementById('imgInput');
    dz.onclick = () => fi.click();
    dz.ondragover = (e) => { e.preventDefault(); dz.style.borderColor='rgba(99,102,241,.5)'; };
    dz.ondragleave = () => { dz.style.borderColor=''; };
    dz.ondrop = (e) => { e.preventDefault(); dz.style.borderColor=''; if(e.dataTransfer.files.length) handleImg(e.dataTransfer.files[0]); };
    fi.onchange = () => { if(fi.files.length) handleImg(fi.files[0]); };
}
function resetCoverSelection() {
    selectedAiCover = null;
    document.getElementById('imgInput').value = '';
    document.getElementById('imgPreviewWrapper').classList.add('hidden');
    document.getElementById('imgInfo').classList.add('hidden');
    document.getElementById('createVideoBtn').disabled = true;
}
function handleImg(file) {
    if(!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedAiCover = null;
        const img = document.getElementById('imgPreview');
        img.src = e.target.result;
        document.getElementById('imgPreviewWrapper').classList.remove('hidden');
        document.getElementById('imgDropContent').classList.add('hidden');
        document.getElementById('imgInfo').classList.remove('hidden');
        document.getElementById('imgName').textContent = file.name + ' (' + (file.size/1024/1024).toFixed(1) + ' MB)';
        const tmpImg = new Image();
        tmpImg.onload = () => { document.getElementById('imgDimensions').textContent = tmpImg.width + '×' + tmpImg.height; };
        tmpImg.src = e.target.result;
        document.getElementById('createVideoBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}
async function generateAiCover() {
    const currentTitle = document.getElementById('modalSongName').textContent;
    
    // Modal'ı aç ve mevcut başlığı göster
    document.getElementById('coverTitleInput').value = currentTitle;
    document.getElementById('coverConfirmModal').classList.remove('hidden');
}

function closeCoverConfirmModal() {
    document.getElementById('coverConfirmModal').classList.add('hidden');
}

async function confirmCoverGenerate() {
    const newTitle = document.getElementById('coverTitleInput').value.trim();
    if(!newTitle) {
        alert('Başlık boş olamaz!');
        return;
    }
    
    closeCoverConfirmModal();
    
    const currentLyrics = knownSongs[videoSongId] ? knownSongs[videoSongId].lyrics || '' : '';
    
    const btn = document.getElementById('aiGenerateBtn');
    const loading = document.getElementById('aiGenerating');
    btn.disabled = true;
    btn.classList.add('opacity-50');
    loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Görsel üretiliyor... (2dk max)</span>';
    loading.classList.remove('hidden');
    document.getElementById('imgPreviewWrapper').classList.add('hidden');
    document.getElementById('imgInfo').classList.add('hidden');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
        const title = document.getElementById('coverTitleInput').value.trim();
        const lyrics = currentLyrics || '';

        // Mark phase in queue panel
        const queueKey = 'video_' + videoSongId;
        if(!activeTasks[queueKey]) {
            activeTasks[queueKey] = { id: queueKey, type: 'video', status: 'running', title: title };
            saveActiveTasks();
        }
        updateTaskPhase(queueKey, '🎨 Kapak resmi üretiliyor...');

        const resp = await fetch('/api/generate-cover', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title: title, lyrics: lyrics}),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await resp.json();

        loading.classList.add('hidden');
        btn.disabled = false;
        btn.classList.remove('opacity-50');

        if (data.ok) {
            selectedAiCover = data.filename;
            document.getElementById('imgPreview').src = data.url;
            document.getElementById('imgPreviewWrapper').classList.remove('hidden');
            document.getElementById('createVideoBtn').disabled = false;
            saveVideoState(videoSongId, { coverUrl: data.url, coverFile: data.filename });
            const qk = 'video_' + videoSongId;
            updateTaskPhase(qk, '✅ Kapak çizildi – Video bekleniyor');
        } else {
            showCoverRetry(data.error || 'Bilinmeyen hata', title, lyrics);
        }
    } catch (e) {
        clearTimeout(timeout);
        btn.disabled = false;
        btn.classList.remove('opacity-50');
        if(e.name === 'AbortError') {
            showCoverRetry('Zaman aşımı (2dk)', document.getElementById('modalSongName').textContent, knownSongs[videoSongId]?.lyrics || '');
        } else {
            showCoverRetry(e.message, document.getElementById('modalSongName').textContent, knownSongs[videoSongId]?.lyrics || '');
        }
    }
}
function showCoverRetry(msg, title, lyrics) {
    const loading = document.getElementById('aiGenerating');
    const safeTitle = (title||'').replace(/'/g,"\'");
    const safeLyrics = (lyrics||'').replace(/'/g,"\'").substring(0,200);
    loading.innerHTML = `
        <div class="text-center">
            <i class="fa-solid fa-xmark text-red-400 text-lg mb-2"></i>
            <div class="text-xs text-red-400 mb-2">${msg}</div>
            <button onclick="generateAiCover()"
                class="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all">
                <i class="fa-solid fa-rotate-right mr-1"></i> Tekrar Dene
            </button>
        </div>`;
}
async function createVideo() {
    const btn = document.getElementById('createVideoBtn');
    btn.disabled = true;

    document.getElementById('videoStep1').classList.add('hidden');
    document.getElementById('videoStep2').classList.remove('hidden');

    const fd = new FormData();
    fd.append('audio_id', videoSongId);
    
    if (selectedAiCover) {
        fd.append('image_path', selectedAiCover);
    } else {
        const fileInput = document.getElementById('imgInput');
        if(!fileInput.files.length) return;
        fd.append('image', fileInput.files[0]);
    }

    try {
        const resp = await fetch('/api/create-video', { method:'POST', body:fd });
        const data = await resp.json();
        if(data.error) { showVideoError(data.error); return; }
        activeVideoTaskId = data.task_id;
        document.getElementById('videoProgressText').textContent = 'Oluşturuluyor...';
        saveVideoState(videoSongId, { step: 2, task_id: data.task_id, video_id: data.video_id });

        const queueKey = 'video_' + videoSongId;
        if(!activeTasks[queueKey]) {
            activeTasks[queueKey] = { id: queueKey, type: 'video', status: 'running', title: document.getElementById('modalSongName').textContent };
        }
        updateTaskPhase(queueKey, '🎥 Video çevriliyor...');
        saveActiveTasks();

        // Poll /api/video-status/<video_id> until ffmpeg completes
        _pollVideoStatus(data.video_id, queueKey);

    } catch(e) { showVideoError(e.message); }
}

async function _pollVideoStatus(videoId, queueKey) {
    const maxWait = 20 * 60 * 1000;
    let elapsed = 0;
    const interval = 3000;

    while (elapsed < maxWait) {
        await sleep(interval);
        elapsed += interval;
        try {
            const r = await fetch('/api/video-status/' + videoId);
            const t = await r.json();

            if (t.status === 'error') {
                showVideoError(t.error || 'Bilinmeyen hata');
                if(activeTasks[queueKey]) { delete activeTasks[queueKey]; saveActiveTasks(); }
                return;
            }
            if (t.status === 'done' && t.download) {
                _applyVideoSuccess(t.download, videoId);
                return;
            }
            // Still processing
            const mins = Math.floor(elapsed / 60000);
            const secs = Math.floor((elapsed % 60000) / 1000);
            const timeStr = mins > 0 ? `${mins}dk ${secs}sn` : `${secs}sn`;
            updateTaskPhase(queueKey, `🎥 Video çevriliyor... (${timeStr})`);
            const pt = document.getElementById('videoProgressText');
            if(pt) pt.textContent = `Oluşturuluyor... (${timeStr})`;
        } catch(err) { /* network blip, keep polling */ }
    }
    showVideoError('Zaman aşımı – video oluşturulamadı.');
    if(activeTasks[queueKey]) { delete activeTasks[queueKey]; saveActiveTasks(); }
}
function _applyVideoSuccess(downloadUrl, videoId) {
    activeVideoTaskId = null;
    const step2 = document.getElementById('videoStep2');
    const step3 = document.getElementById('videoStep3');
    const dlLink = document.getElementById('videoDownloadLink');
    if(!step2 || !step3 || !dlLink) return;
    step2.classList.add('hidden');
    step3.classList.remove('hidden');
    dlLink.href = downloadUrl;
    activeVideoIdForUpload = videoId;
    saveVideoState(videoSongId, { step: 3, download_url: downloadUrl, video_id: videoId });
    const queueKey = 'video_' + videoSongId;
    updateTaskPhase(queueKey, '✅ Video hazır – SEO bekleniyor');
    setTimeout(() => {
        if(activeTasks[queueKey]) { delete activeTasks[queueKey]; saveActiveTasks(); }
    }, 8000);
}

function showVideoError(msg) {
    document.getElementById('videoStep1').classList.add('hidden');
    document.getElementById('videoStep2').classList.add('hidden');
    document.getElementById('videoStep3').classList.add('hidden');
    document.getElementById('videoError').classList.remove('hidden');
    document.getElementById('videoErrorMsg').textContent = msg;
}
function resetVideoModal() { openVideoModal(videoSongId, document.getElementById('modalSongName').textContent); }