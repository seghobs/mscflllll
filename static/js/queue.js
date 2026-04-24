function toggleQueuePanel() {
    const p = document.getElementById('queuePanel');
    if(p) p.classList.toggle('hidden');
}
function getTaskIcon(type) {
    const icons = { youtube: 'fa-brands fa-youtube text-red-400', video: 'fa-solid fa-film text-pink-400', play: 'fa-solid fa-headphones text-green-400', cover: 'fa-solid fa-wand-magic-sparkles text-emerald-400', seo: 'fa-solid fa-tags text-blue-400' };
    return icons[type] || 'fa-solid fa-gear text-indigo-400';
}
function getTaskLabel(type) {
    const labels = { youtube: 'YouTube İndir', video: 'Video Oluştur', play: 'Dinle', cover: 'Şarkı Üretimi', seo: 'SEO Üretimi' };
    return labels[type] || type;
}

function _showQueueToast(msg, color) {
    const t = document.createElement('div');
    t.className = `fixed bottom-20 left-64 z-50 ${color || 'bg-dark-700'} text-white text-xs px-4 py-2 rounded-xl shadow-lg fade-in`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function navigateToTask(type, taskId) {
    if (type === 'video') {
        // Find the matching draft and open its video modal
        if (typeof getDrafts === 'function') {
            const drafts = getDrafts();
            for (let sid in drafts) {
                const d = drafts[sid];
                if (d.type === 'video') {
                    if ((d.videoState && d.videoState.task_id === taskId) || sid === taskId.replace('video_','')) {
                        resumeDraft(sid, 'video');
                        return;
                    }
                }
            }
        }
        // Fallback: if video modal is already open, just bring it to front
        const modal = document.getElementById('videoModal');
        if(modal && !modal.classList.contains('hidden')) return;
        _showQueueToast('Video modalı bir sonraki tıklamada açılacak.', 'bg-indigo-700/90');
    } else if (type === 'cover') {
        if (typeof goToStep === 'function') goToStep(3);
    } else if (type === 'youtube') {
        _showQueueToast('⏬ YouTube indirme devam ediyor...', 'bg-red-700/90');
    } else if (type === 'seo') {
        // SEO tasks run inside the video modal (step 3) — open it if possible
        const modal = document.getElementById('videoModal');
        if(modal && modal.classList.contains('hidden')) {
            _showQueueToast('SEO üretimi arka planda devam ediyor.', 'bg-blue-700/90');
        }
    } else {
        _showQueueToast('İşlem arka planda devam ediyor.', 'bg-dark-700');
    }
}

function resumeVideoTask(taskId) {
    navigateToTask('video', taskId);
}

function updateQueueUI() {
    const sideBadge   = document.getElementById('queueSidebarBadge');
    const emptyState  = document.getElementById('queueEmptyState');
    const list        = document.getElementById('queuePanelList');

    const running = Object.values(activeTasks).filter(t => t.status === 'running');
    const pending = Object.values(activeTasks).filter(t => t.status === 'pending');
    const all     = [...running, ...pending];

    // Keep legacy badge hidden (no longer used):
    const legacyBadge = document.getElementById('queueBadge');
    if(legacyBadge) legacyBadge.classList.add('hidden');

    if(activeVideoTaskId && activeTasks[activeVideoTaskId]) {
        if(!taskStartTimes[activeVideoTaskId]) taskStartTimes[activeVideoTaskId] = Date.now();
        const elapsed = Math.round((Date.now() - taskStartTimes[activeVideoTaskId]) / 1000);
        const vpt = document.getElementById('videoProgressText');
        if(vpt) vpt.textContent = 'Oluşturuluyor... (' + elapsed + 's)';
    }

    if(all.length > 0) {
        // Update sidebar badge
        if(sideBadge) { sideBadge.textContent = all.length; sideBadge.classList.remove('hidden'); }
        if(emptyState) emptyState.style.display = 'none';

        let html = '';
        all.forEach(t => {
            if(!taskStartTimes[t.id]) taskStartTimes[t.id] = Date.now();
            const elapsed = Math.round((Date.now() - taskStartTimes[t.id]) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            const timeStr = mins > 0 ? `${mins}dk ${secs}sn` : `${secs}sn`;
            const spinIcon = t.status === 'running'
                ? '<i class="fa-solid fa-spinner fa-spin text-indigo-400"></i>'
                : '<i class="fa-solid fa-clock text-yellow-400"></i>';

            // Every task is clickable — navigate to the relevant screen
            let navFn = '';
            let navHint = '';
            if (t.type === 'video') {
                navFn  = `navigateToTask('video','${t.id}')`;
                navHint = 'Video modalını aç';
            } else if (t.type === 'cover') {
                navFn  = `navigateToTask('cover','${t.id}')`;
                navHint = 'Üretim adımına git';
            } else if (t.type === 'youtube') {
                navFn  = `navigateToTask('youtube','${t.id}')`;
                navHint = 'İndirme devam ediyor';
            } else if (t.type === 'seo') {
                navFn  = `navigateToTask('seo','${t.id}')`;
                navHint = 'SEO adımına git';
            } else {
                navFn  = `navigateToTask('other','${t.id}')`;
                navHint = 'Göreve git';
            }

            const titleHtml = t.title
                ? `<div class="text-[10px] text-dark-500 truncate" title="${t.title}">${t.title}</div>`
                : '';
            const phaseLabel = t.phase
                ? `<span class="text-indigo-300 text-[10px]">${t.phase}</span>`
                : `<span class="text-dark-500 text-[10px]">${t.status === 'running' ? `Çalışıyor (${timeStr})` : 'Bekliyor'}</span>`;

            html += `<div onclick="${navFn}" title="${navHint}"
                class="group bg-dark-800/60 hover:bg-dark-700/90 border border-transparent hover:border-indigo-500/40
                       rounded-xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-all duration-150 select-none">
                <div class="w-7 h-7 rounded-lg bg-dark-700 group-hover:bg-dark-600 flex items-center justify-center flex-shrink-0 transition">
                    <i class="${getTaskIcon(t.type)} text-xs"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium truncate text-white">${getTaskLabel(t.type)}</div>
                    ${titleHtml}
                    <div class="flex items-center gap-1 mt-0.5">${spinIcon} ${phaseLabel}</div>
                </div>
                <i class="fa-solid fa-chevron-right text-dark-600 group-hover:text-indigo-400 text-[9px] flex-shrink-0 transition"></i>
            </div>`;
        });

        if(list) {
            // Keep empty state DOM but hide it; prepend task cards
            const empty = list.querySelector('#queueEmptyState');
            list.innerHTML = html;
            // re-append empty state (hidden) for future use
            const emptyEl = document.createElement('div');
            emptyEl.id = 'queueEmptyState';
            emptyEl.style.display = 'none';
            emptyEl.className = 'text-center py-10 text-dark-600';
            emptyEl.innerHTML = '<i class="fa-solid fa-check-circle text-2xl mb-2 opacity-40"></i><p class="text-xs">Çalışan işlem yok</p>';
            list.appendChild(emptyEl);
        }
    } else {
        if(sideBadge) { sideBadge.textContent = '0'; sideBadge.classList.add('hidden'); }
        const emptyEl = document.getElementById('queueEmptyState');
        if(emptyEl) { emptyEl.style.display = ''; }
        if(list) {
            // Clear task cards, keep empty state
            Array.from(list.children).forEach(c => { if(c.id !== 'queueEmptyState') c.remove(); });
        }
    }
}

setInterval(updateQueueUI, 1000);

function initSSE() {
    // Restore tasks saved in localStorage, then verify which are still alive on server
    loadActiveTasks();
    _verifyRestoredTasks();

    const es = new EventSource('/api/events');

    es.addEventListener('task_update', (e) => {
        const data = JSON.parse(e.data);
        if(data.status === 'done' || data.status === 'error') {
            delete activeTasks[data.id];
            if(typeof saveActiveTasks === 'function') saveActiveTasks();
            if(data.type === 'youtube') {
                if(data.status === 'error') {
                    const statusText = document.getElementById('ytStatusText');
                    const btn = document.getElementById('ytBtn');
                    statusText.innerHTML = `<i class="fa-solid fa-xmark mr-1 text-red-400"></i>${data.error || 'Hata'}`;
                    btn.disabled = false;
                    btn.classList.remove('opacity-50');
                } else {
                    fetch('/api/youtube/status/' + data.id).then(r => r.json()).then(pdata => {
                        if(pdata.status === 'done' && pdata.data && pdata.data.song_ids) {
                            const ytTitle = pdata._yt_title || 'YouTube Şarkı';
                            const songId = pdata.data.song_ids[0];
                            state.audioId = songId;
                            state.title = ytTitle;

                            const status = document.getElementById('uploadStatus');
                            const progress = document.getElementById('uploadProgress');
                            const text = document.getElementById('uploadText');
                            const percent = document.getElementById('uploadPercent');
                            const label = document.getElementById('fileLabel');
                            const statusDiv = document.getElementById('ytStatus');
                            const btn = document.getElementById('ytBtn');

                            status.classList.remove('hidden');
                            label.innerHTML = `<div class="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><i class="fa-brands fa-youtube text-3xl text-red-400"></i></div><div class="text-red-400 font-medium mb-1">${ytTitle}</div><div class="text-dark-500 text-sm">YouTube'dan indirildi</div>`;
                            statusDiv.classList.add('hidden');
                            btn.disabled = false;
                            btn.classList.remove('opacity-50');
                            if(typeof pollForLyrics === 'function') pollForLyrics(songId, progress, text, percent);
                        }
                    });
                }
            } else if(data.type === 'video' && data.id === activeVideoTaskId) {
                activeVideoTaskId = null;
                if(data.status === 'error') {
                    if(typeof showVideoError === 'function') showVideoError(data.error || 'Bilinmeyen hata');
                } else {
                    // Fetch the real download URL from the server (SSE result may be incomplete)
                    const videoIdFromState = (() => {
                        for(let sid in (window.videoStates || {})) {
                            if(window.videoStates[sid].task_id === data.id) return window.videoStates[sid].video_id_ffmpeg || sid;
                        }
                        return null;
                    })();

                    // Try from SSE result first, fallback to video-status endpoint
                    if(data.result && data.result.download) {
                        _applyVideoSuccess(data.result.download, data.result.video_id);
                    } else if(data.result && data.result.video_id) {
                        fetch('/api/video-status/' + data.result.video_id)
                            .then(r => r.json()).then(t => {
                                if(t.status === 'done' && t.download) _applyVideoSuccess(t.download, data.result.video_id);
                                else if(t.status === 'error') { if(typeof showVideoError === 'function') showVideoError(t.error || 'Hata'); }
                            });
                    } else if(data.result && data.result.error) {
                        if(typeof showVideoError === 'function') showVideoError(data.result.error);
                    }
                }
            }
        } else {
            activeTasks[data.id] = data;
        }
        updateQueueUI();
    });

    es.addEventListener('song_ready', (e) => {
        const song = JSON.parse(e.data);
        if(typeof syncSongs === 'function') syncSongs([song]);
    });

    es.onerror = () => {
        setTimeout(initSSE, 5000);
        es.close();
    };
}