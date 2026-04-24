async function loadRights() {
    try {
        const r = await fetch('/api/rights').then(r=>r.json());
        const d = r.data.result;
        const pct = Math.round((d.left/d.all)*100);
        document.getElementById('rights-bar').innerHTML = `
            <div class="flex items-center gap-4 flex-wrap">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-ticket text-indigo-400"></i>
                    <span class="text-dark-300">Kalan: <b class="text-white">${d.left}</b> / ${d.all}</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-chart-pie text-purple-400"></i>
                    <span class="text-dark-300">Kullanılan: <b class="text-white">${d.used}</b></span>
                </div>
                <div class="w-24 bg-dark-800 rounded-full h-1.5">
                    <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style="width:${pct}%"></div>
                </div>
                ${d.is_vip ? '<span class="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full"><i class="fa-solid fa-crown mr-1"></i>VIP</span>' : ''}
            </div>
        `;
    } catch(e) {
        document.getElementById('rights-bar').innerHTML = '<span class="text-red-400"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Hak bilgisi alınamadı</span>';
    }
}
function setupDropzone() {
    const dz = document.getElementById('dropzone');
    const fi = document.getElementById('fileInput');
    dz.onclick = () => fi.click();
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('border-indigo-500/60','bg-indigo-500/5'); };
    dz.ondragleave = () => { dz.classList.remove('border-indigo-500/60','bg-indigo-500/5'); };
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('border-indigo-500/60','bg-indigo-500/5'); if(e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]); };
    fi.onchange = () => { if(fi.files.length) uploadFile(fi.files[0]); };
}
async function uploadFile(file) {
    const status = document.getElementById('uploadStatus');
    const progress = document.getElementById('uploadProgress');
    const text = document.getElementById('uploadText');
    const percent = document.getElementById('uploadPercent');
    const label = document.getElementById('fileLabel');

    status.classList.remove('hidden');
    label.innerHTML = `
        <div class="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-arrow-up-from-bracket text-3xl text-indigo-400"></i>
        </div>
        <div class="text-indigo-400 font-medium mb-1">${file.name}</div>
        <div class="text-dark-500 text-sm">${(file.size/1024/1024).toFixed(1)} MB</div>
    `;
    text.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Yükleniyor...';
    percent.textContent = '30%';
    progress.style.width = '30%';

    const formData = new FormData();
    formData.append('audio', file);

    try {
        const resp = await fetch('/api/upload', {method:'POST', body:formData});
        const data = await resp.json();
        if(data.data && data.data.song_ids) {
            progress.style.width = '50%';
            percent.textContent = '50%';
            text.innerHTML = '<i class="fa-solid fa-cog fa-spin mr-1"></i>İşleniyor...';
            const songId = data.data.song_ids[0];
            state.audioId = songId;
            await pollForLyrics(songId, progress, text, percent);
        } else {
            text.innerHTML = '<i class="fa-solid fa-xmark mr-1 text-red-400"></i>Hata';
        }
    } catch(e) {
        text.innerHTML = `<i class="fa-solid fa-xmark mr-1 text-red-400"></i>${e.message}`;
    }
}
async function pollForLyrics(songId, progress, text, percent) {
    let elapsed = 0;
    let emptyRetries = 0;
    const MAX_EMPTY_RETRIES = 6; // 30 extra seconds
    while(elapsed < 120000) {
        try {
            const resp = await fetch(`/api/task/${songId}`);
            const data = await resp.json();
            const song = data.data.result[0];
            if(song.audio_url && song.status === 0) {
                const lyricsRaw = (song.lyrics || song.lyric || '').trim();
                const styleRaw  = (song.style || '').trim();

                // If both empty and we have retries left, keep polling
                if(!lyricsRaw && !styleRaw && emptyRetries < MAX_EMPTY_RETRIES) {
                    emptyRetries++;
                    const remaining = MAX_EMPTY_RETRIES - emptyRetries;
                    text.innerHTML = `<i class="fa-solid fa-cog fa-spin mr-1"></i>Sözler bekleniyor... (${remaining} deneme kaldı)`;
                    await sleep(5000);
                    elapsed += 5000;
                    continue;
                }

                // Commit result (even if empty, we tried enough)
                progress.style.width = '100%';
                percent.textContent = '100%';
                text.innerHTML = '<i class="fa-solid fa-check mr-1 text-green-400"></i>Tamamlandı!';
                if(!state.title) state.title = song.title || 'Cover';
                state.lyrics  = lyricsRaw.replace(/\r\n/g, '\n');
                state.audioId = song.song_id || songId;
                document.getElementById('songTitle').value  = state.title;
                document.getElementById('songLyrics').value = state.lyrics;
                if(styleRaw) {
                    document.getElementById('songStyle').value = styleRaw;
                    state.style = styleRaw;
                }
                setTimeout(()=>goToStep(2), 500);
                return;
            } else if(song.status === 3) {
                progress.style.width = '100%';
                progress.classList.remove('from-indigo-500','to-purple-500');
                progress.classList.add('from-red-500','to-red-600');
                percent.textContent = '!';
                text.innerHTML = '<i class="fa-solid fa-xmark mr-1 text-red-400"></i>Yükleme başarısız';
                return;
            } else {
                const p = Math.min(50 + (elapsed/120000)*45, 95);
                progress.style.width = p+'%';
                percent.textContent = Math.round(p)+'%';
                text.innerHTML = `<i class="fa-solid fa-cog fa-spin mr-1"></i>İşleniyor... (${Math.round(elapsed/1000)}s)`;
            }
        } catch(e) {}
        await sleep(5000);
        elapsed += 5000;
    }
    text.innerHTML = '<i class="fa-solid fa-clock mr-1 text-yellow-400"></i>Zaman aşımı';
}