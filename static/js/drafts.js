function getDrafts() {
    try { return JSON.parse(localStorage.getItem('musicful_drafts')) || {}; } catch(e) { return {}; }
}

function saveDraftState(id, data) {
    const drafts = getDrafts();
    if (!drafts[id]) drafts[id] = { id: id, updatedAt: Date.now() };
    drafts[id] = { ...drafts[id], ...data, updatedAt: Date.now() };
    localStorage.setItem('musicful_drafts', JSON.stringify(drafts));
    updateDraftsUI();
}

function removeDraftState(id) {
    const drafts = getDrafts();
    if (drafts[id]) {
        delete drafts[id];
        localStorage.setItem('musicful_drafts', JSON.stringify(drafts));
        updateDraftsUI();
    }
}

function toggleDraftsPanel() {
    const p = document.getElementById('draftsPanel');
    if (p.classList.contains('translate-x-full')) {
        p.classList.remove('translate-x-full');
        updateDraftsUI();
    } else {
        p.classList.add('translate-x-full');
    }
}

function resumeDraft(id, type) {
    const draft = getDrafts()[id];
    if(!draft) return;
    
    if (type === 'cover') {
        state.audioId = draft.audioId || state.audioId;
        if(draft.songTitle) document.getElementById('songTitle').value = draft.songTitle;
        if(draft.songStyle) document.getElementById('songStyle').value = draft.songStyle;
        if(draft.songLyrics) document.getElementById('songLyrics').value = draft.songLyrics;
        goToStep(2);
        toggleDraftsPanel();
    } else if (type === 'video') {
        if(!window.videoStates) window.videoStates = {};
        const vs = draft.videoState || {};
        window.videoStates[id] = vs;

        // If draft was mid-encoding (step 2), verify the task still exists on server
        if (vs.step === 2 && vs.video_id) {
            fetch('/api/video-status/' + vs.video_id)
                .then(r => r.json())
                .then(t => {
                    if (t.status === 'done' && t.download) {
                        // Completed while we were away — restore to step 3
                        vs.step = 3;
                        vs.download_url = t.download;
                        window.videoStates[id] = vs;
                        saveDraftState(id, { videoState: vs });
                        openVideoModal(id, draft.title || id);
                    } else if (t.status === 'processing' || t.status === 'not_found' || !t.status) {
                        // Server restarted / task gone → reset to step 1, ask user to re-render
                        vs.step = 1;
                        vs.task_id = null;
                        window.videoStates[id] = vs;
                        saveDraftState(id, { videoState: vs });
                        openVideoModal(id, draft.title || id);
                        // Brief toast to explain
                        setTimeout(() => {
                            const info = document.createElement('div');
                            info.className = 'fixed top-4 right-4 z-50 bg-yellow-600/90 text-white text-sm px-4 py-2 rounded-xl shadow-lg fade-in';
                            info.innerHTML = '<i class="fa-solid fa-circle-info mr-2"></i>Sunucu yeniden başlatıldı — video yeniden oluşturulmalı.';
                            document.body.appendChild(info);
                            setTimeout(() => info.remove(), 5000);
                        }, 500);
                    } else {
                        // Still running — resume polling
                        openVideoModal(id, draft.title || id);
                        const queueKey = 'video_' + id;
                        if(!activeTasks[queueKey]) {
                            activeTasks[queueKey] = { id: queueKey, type: 'video', status: 'running', title: draft.title || id };
                            saveActiveTasks();
                        }
                        _pollVideoStatus(vs.video_id, queueKey);
                    }
                })
                .catch(() => {
                    // Network error — just open modal at step 1
                    vs.step = 1; vs.task_id = null;
                    window.videoStates[id] = vs;
                    openVideoModal(id, draft.title || id);
                });
        } else if (vs.step === 2) {
            // Old draft format: step 2 but no video_id stored — server state is gone, reset to step 1
            vs.step = 1;
            vs.task_id = null;
            window.videoStates[id] = vs;
            saveDraftState(id, { videoState: vs });
            openVideoModal(id, draft.title || id);
            setTimeout(() => {
                const info = document.createElement('div');
                info.className = 'fixed top-4 right-4 z-50 bg-yellow-600/90 text-white text-sm px-4 py-2 rounded-xl shadow-lg fade-in';
                info.innerHTML = '<i class="fa-solid fa-circle-info mr-2"></i>Video işlemi kayboldu — kapak seçip tekrar oluşturabilirsin.';
                document.body.appendChild(info);
                setTimeout(() => info.remove(), 6000);
            }, 400);
        } else {
            openVideoModal(id, draft.title || id);
        }
        toggleDraftsPanel();
    }
}

function updateDraftsUI() {
    const drafts = getDrafts();
    const list = document.getElementById('draftsList');
    const toggleBtn = document.getElementById('draftsToggleBtn');
    if (!list) return;
    
    const arr = Object.values(drafts).sort((a,b) => b.updatedAt - a.updatedAt);
    
    if (arr.length > 0) {
        toggleBtn.classList.remove('hidden');
        let html = '';
        arr.forEach(d => {
            const dateStr = new Date(d.updatedAt).toLocaleTimeString();
            let icon = 'fa-solid fa-file-pen pt-1';
            let title = d.title || 'İsimsiz Şarkı';
            let subtitle = 'Düzenleniyor';
            let btnClass = 'bg-indigo-600 hover:bg-indigo-500';
            
            if (d.type === 'video') {
                icon = 'fa-solid fa-film text-pink-400 pt-1';
                subtitle = 'Kapak / Video / SEO';
                btnClass = 'bg-pink-600 hover:bg-pink-500';
            } else if (d.type === 'cover') {
                icon = 'fa-solid fa-music text-green-400 pt-1';
                subtitle = 'Sözler & Stil';
                title = d.songTitle || 'Yeni Cover Projesi';
                btnClass = 'bg-green-600 hover:bg-green-500';
            }

            html += `
                <div class="bg-dark-800 rounded-xl p-3 border border-dark-700 fade-in">
                    <div class="flex items-start justify-between mb-2 gap-2">
                        <div class="flex items-start gap-2 max-w-[85%]">
                            <i class="${icon}"></i>
                            <div class="font-semibold text-xs text-white break-words">${title}</div>
                        </div>
                        <button onclick="removeDraftState('${d.id}')" class="text-dark-500 hover:text-red-400 transition flex-shrink-0"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                    <div class="text-[10px] text-dark-400 mb-3">${subtitle} • ${dateStr}</div>
                    <button onclick="resumeDraft('${d.id}', '${d.type}')" class="w-full ${btnClass} text-white font-semibold text-xs py-2 rounded-lg transition">
                        Kaldığı Yerden Devam Et <i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                </div>
            `;
        });
        list.innerHTML = html;
        document.getElementById('draftsCountBadge').textContent = arr.length;
        document.getElementById('draftsCountBadge').classList.remove('hidden');
    } else {
        toggleBtn.classList.add('hidden');
        list.innerHTML = `<div class="text-center py-6 text-dark-500 text-sm"><i class="fa-solid fa-check-circle text-2xl mb-2 opacity-50"></i><br>Yarıda kalmış işleminiz yok.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(updateDraftsUI, 1000); });
