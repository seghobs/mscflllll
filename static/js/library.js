function showResults(songs) {
    goToStep(4);
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
    songs.forEach((song,i) => {
        const dur = song.duration>0 ? `${Math.round(song.duration/1000)}s` : 'N/A';
        const url = `/api/download/${song.song_id}`;
        container.innerHTML += `
            <div class="song-card bg-dark-800/60 rounded-xl p-5 card-hover border border-dark-700/50 fade-in" data-sid="${song.song_id}" data-title="${(song.title||'Versiyon '+(i+1)).replace(/"/g,'&quot;')}" data-dur="${song.duration||0}" data-ready="true" style="animation-delay:${i*0.1}s">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-xs font-bold">${i+1}</span>
                            <span class="font-semibold">${song.title || 'Versiyon '+(i+1)}</span>
                        </div>
                        <div class="text-sm text-dark-400 flex items-center gap-3">
                            <span><i class="fa-regular fa-clock mr-1"></i>${dur}</span>
                            <span class="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full"><i class="fa-solid fa-check mr-1"></i>Hazır</span>
                        </div>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button onclick="togglePlay('${song.song_id}',this)" class="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition">
                            <i class="fa-solid fa-play"></i> Dinle
                        </button>
                        <a href="${url}" download class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all btn-glow">
                            <i class="fa-solid fa-download"></i> İndir
                        </a>
                        <button onclick="openVideoModal('${song.song_id}','${(song.title||'Versiyon '+(i+1)).replace(/'/g,"\\'").replace(/"/g,"&quot;")}')" class="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all btn-glow">
                            <i class="fa-solid fa-film"></i> Video
                        </button>
                    </div>
                </div>
                ${song.lyric ? `<details class="mt-3"><summary class="text-xs text-dark-400 cursor-pointer hover:text-dark-300 transition"><i class="fa-solid fa-chevron-right mr-1"></i>Sözleri göster</summary><pre class="text-xs text-dark-400 mt-2 whitespace-pre-wrap bg-dark-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">${song.lyric}</pre></details>` : ''}
            </div>
        `;
    });
}
async function loadAllSongs() {
    const container = document.getElementById('allSongsContainer');
    container.innerHTML = '<div class="flex items-center justify-center py-8"><i class="fa-solid fa-spinner fa-spin text-dark-500 mr-2"></i><span class="text-dark-500 text-sm">Yükleniyor...</span></div>';

    try {
        const resp = await fetch('/api/songs?limit=20');
        const data = await resp.json();
        const songs = data.data.list;
        if(!songs.length) {
            container.innerHTML = '<div class="text-center py-8"><i class="fa-regular fa-folder-open text-3xl text-dark-600 mb-2"></i><p class="text-dark-500 text-sm">Henüz şarkı yok</p></div>';
            return;
        }
        container.innerHTML = '';
        songs.forEach((song,idx) => {
            knownSongs[song.song_id] = song;
            const dur = song.duration>0 ? `${Math.round(song.duration/1000)}s` : 'İşleniyor...';
            const isReady = song.audio_url && song.duration>0;
            const songUuid = song.song_id;
            const url = `/api/download/${songUuid}`;
            const badge = song.is_cover ? '<span class="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full"><i class="fa-solid fa-masks-theater mr-1"></i>Cover</span>' : song.is_upload ? '<span class="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full"><i class="fa-solid fa-cloud-arrow-up mr-1"></i>Upload</span>' : '';

            let actions = '';
            if(isReady) {
                actions = `
                    <button onclick="togglePlay('${songUuid}',this)" class="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition">
                        <i class="fa-solid fa-play"></i> Dinle
                    </button>
                    <a href="${url}" download class="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition">
                        <i class="fa-solid fa-download"></i> İndir
                    </a>
                `;
            } else {
                actions = `<span class="text-yellow-400/80 text-sm flex items-center gap-1.5"><i class="fa-solid fa-spinner fa-spin"></i> İşleniyor</span>`;
            }

            container.innerHTML += `
                <div class="song-card bg-dark-800/40 hover:bg-dark-800/60 rounded-xl p-4 mb-2 border border-dark-700/30 hover:border-dark-600/50 transition-all card-hover fade-in" data-sid="${songUuid}" data-title="${(song.title||'Adsız').replace(/"/g,'&quot;')}" data-dur="${song.duration||0}" data-ready="${isReady}" style="animation-delay:${idx*0.05}s">
                    <div class="flex justify-between items-start">
                        <div class="flex-1 min-w-0 mr-4">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="fa-solid fa-music text-dark-500 text-xs"></i>
                                <span class="font-medium truncate">${song.title || 'Adsız'}</span>
                                ${badge}
                            </div>
                            <div class="text-sm text-dark-500 flex items-center gap-2">
                                <i class="fa-regular fa-clock text-xs"></i> ${dur}
                            </div>
                            ${song.lyrics ? `<details class="mt-2"><summary class="text-xs text-dark-500 cursor-pointer hover:text-dark-400 transition"><i class="fa-solid fa-chevron-right mr-1"></i>Sözler</summary><pre class="text-xs text-dark-500 mt-1 whitespace-pre-wrap max-h-28 overflow-y-auto bg-dark-900/30 rounded-lg p-2">${song.lyrics.substring(0,400)}</pre></details>` : ''}
                        </div>
                        <div class="flex gap-2 flex-shrink-0">${actions}</div>
                    </div>
                </div>
            `;
        });
    } catch(e) {
        container.innerHTML = `<div class="text-center py-8"><i class="fa-solid fa-triangle-exclamation text-2xl text-red-400 mb-2"></i><p class="text-red-400 text-sm">${e.message}</p></div>`;
    }
}
function togglePlay(uuid, btn) {
    const title = btn.closest('.song-card')?.dataset?.title || 'Şarkı';
    const url = '/api/download/' + uuid;

    document.querySelectorAll('.song-card button').forEach(b => {
        if(b !== btn && b.querySelector('i.fa-pause')) {
            b.innerHTML = '<i class="fa-solid fa-play"></i> Dinle';
            b.classList.remove('bg-indigo-500/40');
            b.classList.add('bg-indigo-500/50');
        }
    });

    if(fpAudio && fpCurrentId === url && !fpAudio.paused) {
        fpAudio.pause();
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Dinle';
        btn.classList.remove('bg-indigo-500/40');
        btn.classList.add('bg-indigo-500/20');
        return;
    }

    if(fpAudio && fpCurrentId === url && fpAudio.paused) {
        fpAudio.play();
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Duraklat';
        btn.classList.remove('bg-indigo-500/20');
        btn.classList.add('bg-indigo-500/40');
        return;
    }

    if(typeof playLocalSong === 'function') playLocalSong(uuid, title);
    btn.innerHTML = '<i class="fa-solid fa-pause"></i> Duraklat';
    btn.classList.remove('bg-indigo-500/20');
    btn.classList.add('bg-indigo-500/40');
}
function syncSongs(newSongs) {
    const container = document.getElementById('allSongsContainer');
    newSongs.forEach(song => {
        const sid = song.song_id;
        const isReady = song.audio_url && song.duration > 0;
        const prev = knownSongs[sid];
        const wasReady = prev ? (prev.audio_url && prev.duration > 0) : null;
        knownSongs[sid] = song;
        if(prev === undefined) { loadAllSongs(); return; }
        if(isReady && !wasReady) {
            const card = container.querySelector(`[data-sid="${sid}"]`);
            if(card) {
                const url = `/api/download/${sid}`;
                const dur = song.duration > 0 ? `${Math.round(song.duration/1000)}s` : 'N/A';
                const badge = song.is_cover ? '<span class="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full"><i class="fa-solid fa-masks-theater mr-1"></i>Cover</span>' : song.is_upload ? '<span class="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full"><i class="fa-solid fa-cloud-arrow-up mr-1"></i>Upload</span>' : '';
                card.dataset.ready = 'true';
                card.dataset.dur = song.duration || 0;
                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex-1 min-w-0 mr-4">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="fa-solid fa-music text-dark-500 text-xs"></i>
                                <span class="font-medium truncate">${song.title || 'Adsız'}</span>
                                ${badge}
                            </div>
                            <div class="text-sm text-dark-500 flex items-center gap-2">
                                <i class="fa-regular fa-clock text-xs"></i> ${dur}
                            </div>
                            ${song.lyrics ? `<details class="mt-2"><summary class="text-xs text-dark-500 cursor-pointer hover:text-dark-400 transition"><i class="fa-solid fa-chevron-right mr-1"></i>Sözler</summary><pre class="text-xs text-dark-500 mt-1 whitespace-pre-wrap max-h-28 overflow-y-auto bg-dark-900/30 rounded-lg p-2">${song.lyrics.substring(0,400)}</pre></details>` : ''}
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                            <button onclick="togglePlay('${sid}',this)" class="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition">
                                <i class="fa-solid fa-play"></i> Dinle
                            </button>
                            <a href="${url}" download class="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition">
                                <i class="fa-solid fa-download"></i> İndir
                            </a>
                        </div>
                    </div>
                `;
                card.classList.add('border-green-500/40');
                setTimeout(() => card.classList.remove('border-green-500/40'), 3000);
            }
        }
    });
}
document.addEventListener('click', () => document.getElementById('ctxMenu')?.classList.add('hidden'));
document.addEventListener('contextmenu', (e) => {
    if(!e.target.closest('.song-card')) return;
    e.preventDefault();
    const card = e.target.closest('.song-card');
    ctxSong = { id: card.dataset.sid, title: card.dataset.title, dur: card.dataset.dur, ready: card.dataset.ready==='true' };
    const menu = document.getElementById('ctxMenu');
    if(!menu) return;
    menu.classList.remove('hidden');
    let x = e.clientX, y = e.clientY;
    if(x + 200 > window.innerWidth) x = window.innerWidth - 210;
    if(y + 150 > window.innerHeight) y = window.innerHeight - 160;
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
});
function ctxDinle() { if(ctxSong.ready && typeof playLocalSong === 'function') playLocalSong(ctxSong.id, ctxSong.title); }
function ctxIndir() { if(ctxSong.ready) window.location.href = '/api/download/'+ctxSong.id; }
function ctxVideo() { if(ctxSong.ready && typeof openVideoModal === 'function') openVideoModal(ctxSong.id, ctxSong.title); }
function ctxCover() {
    if(!ctxSong.ready) return;
    const song = knownSongs[ctxSong.id] || {};
    state.audioId = ctxSong.id;
    document.getElementById('songTitle').value = song.title || ctxSong.title || '';
    document.getElementById('songLyrics').value = song.lyrics || song.lyric || '';
    document.getElementById('songStyle').value = song.style || '';
    goToStep(2);
    window.scrollTo({top:0, behavior:'smooth'});
}
setInterval(() => {
    const hasProcessing = Object.values(knownSongs).some(s => !(s.audio_url && s.duration > 0));
    if(!hasProcessing || document.hidden) return;
    fetch('/api/songs?limit=20').then(r => r.json()).then(data => {
        if(data.data && data.data.list) syncSongs(data.data.list);
    }).catch(() => {});
}, 10000);