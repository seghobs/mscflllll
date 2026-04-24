async function createSong() {
    activeTaskCounter++;
    const taskId = 'task_' + activeTaskCounter;
    const taskList = document.getElementById('createTaskList');

    const card = document.createElement('div');
    card.id = taskId;
    card.className = 'bg-dark-800/60 rounded-xl p-4 border border-dark-700/50 fade-in';
    card.innerHTML = `
        <div class="flex items-center gap-3 mb-3">
            <i class="fa-solid fa-spinner fa-spin text-indigo-400"></i>
            <span class="ct-text text-sm text-dark-300 flex-1"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Şarkı oluşturuluyor...</span>
            <span class="ct-title text-xs text-dark-500 truncate max-w-[120px]">${state.title || ''}</span>
        </div>
        <div class="bg-dark-900 rounded-full h-2 overflow-hidden">
            <div class="ct-bar bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500" style="width:10%"></div>
        </div>
    `;
    taskList.prepend(card);
    activeTasks[taskId] = { id: taskId, type: 'cover', status: 'running', title: state.title };
    saveActiveTasks();

    try {
        if(typeof removeDraftState === 'function') removeDraftState('active_cover');
        const resp = await fetch('/api/make-song', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({audio_id:state.audioId, title:state.title, lyrics:state.lyrics, style:state.style, mv:'v5.0'})
        });
        const data = await resp.json();
        if(data.data && data.data.song_ids) {
            const songIds = data.data.song_ids;
            const text = card.querySelector('.ct-text');
            const bar = card.querySelector('.ct-bar');
            text.innerHTML = `<i class="fa-solid fa-layer-group mr-1"></i>2 versiyon oluşturuluyor...`;
            bar.style.width = '20%';
            pollForTask(taskId, songIds);
        } else {
            taskError(card, 'Hata: ' + JSON.stringify(data));
        }
    } catch(e) {
        taskError(card, e.message);
    }
}
function taskError(card, msg) {
    const taskId = card.id;
    if(activeTasks[taskId]) { delete activeTasks[taskId]; saveActiveTasks(); }
    if(card) {
        card.querySelector('.ct-text').innerHTML = `<i class="fa-solid fa-xmark mr-1 text-red-400"></i>${msg}`;
        card.querySelector('.ct-bar').classList.remove('from-green-500','to-emerald-500');
        card.querySelector('.ct-bar').classList.add('from-red-500','to-red-600');
        card.querySelector('.ct-bar').style.width = '100%';
    }
}
async function pollForTask(taskId, songIds) {
    const card = document.getElementById(taskId);
    if(!card) return;
    const bar = card.querySelector('.ct-bar');
    const text = card.querySelector('.ct-text');
    const ids = songIds.join(',');
    let elapsed = 0;

    while(elapsed < 300000) {
        if(!document.getElementById(taskId)) return;
        try {
            const resp = await fetch(`/api/poll/${ids}`);
            const data = await resp.json();
            const songs = data.data.result;
            const allDone = songs.every(s=>s.status===0);
            const anyFailed = songs.some(s=>s.status===3);

            if(anyFailed && !allDone) {
                taskError(card, 'Üretilemedi! Farklı şarkı deneyin.');
                return;
            }

            const doneCount = songs.filter(s=>s.status===0).length;
            bar.style.width = (20 + (doneCount/songs.length)*70)+'%';
            text.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>${doneCount}/${songs.length} tamamlandı (${Math.round(elapsed/1000)}s)`;

            if(allDone) {
                const allReady = await checkCDNReady(songs);
                if(!allReady) {
                    bar.style.width = '95%';
                    text.innerHTML = `<i class="fa-solid fa-hard-drive mr-1"></i>Dosyalar hazırlanıyor... (${Math.round(elapsed/1000)}s`;
                } else {
                    bar.style.width = '100%';
                    bar.classList.remove('from-green-500','to-emerald-500');
                    bar.classList.add('from-indigo-500','to-purple-500');
                    text.innerHTML = '<i class="fa-solid fa-check mr-1 text-green-400"></i>Tamamlandı! ' + (songs[0]?.title || '');
                    loadAllSongs();
                    setTimeout(()=>showResults(songs), 500);
                    if(activeTasks[taskId]) { delete activeTasks[taskId]; saveActiveTasks(); }
                    return;
                }
            }
        } catch(e) {
            text.innerHTML = `<i class="fa-solid fa-xmark mr-1 text-red-400"></i>${e.message}`;
        }
        await sleep(5000);
        elapsed += 5000;
    }
    text.innerHTML = '<i class="fa-solid fa-clock mr-1 text-yellow-400"></i>Zaman aşımı';
}
async function checkCDNReady(songs) {
    for(const song of songs) {
        try { const r = await fetch(`/api/check-download/${song.song_id}`); const d = await r.json(); if(!d.ready) return false; }
        catch(e) { return false; }
    }
    return true;
}