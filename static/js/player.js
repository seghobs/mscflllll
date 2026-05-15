/* ===== HOLD-TO-SEEK WITH ACCELERATION ===== */
function fpStartSeek(direction) {
    if(!fpAudio || !fpAudio.duration) return;
    fpStopSeek();
    fpSeekAccel = 0;

    const doSeek = () => {
        if(!fpAudio || !fpAudio.duration) { fpStopSeek(); return; }
        fpSeekAccel = Math.min(fpSeekAccel + 1, 30);
        // Acceleration: 1s base, grows by 0.5s per tick, max 16s per tick
        const step = 1 + Math.floor(fpSeekAccel * 0.5);
        const amount = direction * step;
        fpAudio.currentTime = Math.max(0, Math.min(fpAudio.currentTime + amount, fpAudio.duration));

        // Visual feedback
        const indicator = document.getElementById('fpSeekIndicator');
        const sign = direction > 0 ? '+' : '';
        indicator.textContent = sign + step + 's';
        indicator.classList.add('visible');

        // Update bar immediately
        document.getElementById('fpBar').style.width = (fpAudio.currentTime / fpAudio.duration * 100) + '%';
        document.getElementById('fpCur').textContent = formatTime(fpAudio.currentTime);
    };

    doSeek(); // Immediate first seek
    fpSeekTimer = setInterval(doSeek, 200);
}

function fpStopSeek() {
    if(fpSeekTimer) {
        clearInterval(fpSeekTimer);
        fpSeekTimer = null;
    }
    fpSeekAccel = 0;
    const indicator = document.getElementById('fpSeekIndicator');
    if(indicator) indicator.classList.remove('visible');
}

/* ===== PROGRESS BAR DRAG / TAP ===== */
function fpGetBarPct(e) {
    const wrap = document.getElementById('fpBarWrap');
    const rect = wrap.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
}

function fpBarDown(e) {
    if(!fpAudio || !fpAudio.duration) return;
    e.preventDefault();
    fpBarDragging = true;
    const wrap = document.getElementById('fpBarWrap');
    wrap.classList.add('dragging');
    const pct = fpGetBarPct(e);
    fpAudio.currentTime = pct * fpAudio.duration;
    document.getElementById('fpBar').style.width = (pct * 100) + '%';
    document.getElementById('fpCur').textContent = formatTime(fpAudio.currentTime);
}

function fpBarMove(e) {
    if(!fpBarDragging || !fpAudio || !fpAudio.duration) return;
    e.preventDefault();
    const pct = fpGetBarPct(e);
    fpAudio.currentTime = pct * fpAudio.duration;
    document.getElementById('fpBar').style.width = (pct * 100) + '%';
    document.getElementById('fpCur').textContent = formatTime(fpAudio.currentTime);
}

function fpBarUp(e) {
    if(!fpBarDragging) return;
    fpBarDragging = false;
    const wrap = document.getElementById('fpBarWrap');
    wrap.classList.remove('dragging');
}

/* ===== VOLUME ===== */
function fpVolume(val) {
    localStorage.setItem('global_volume', val);
    if(fpAudio) fpAudio.volume = val;
    const icon = document.getElementById('fpVolIcon');
    if (icon) {
        if(val == 0) icon.className = 'fa-solid fa-volume-xmark fp-vol-icon';
        else if(val < 0.5) icon.className = 'fa-solid fa-volume-low fp-vol-icon';
        else icon.className = 'fa-solid fa-volume-high fp-vol-icon';
    }
}

function fpMute() {
    if(!fpAudio) return;
    const slider = document.getElementById('fpVolSlider');
    if(fpAudio.volume > 0) {
        fpAudio._prevVol = fpAudio.volume;
        fpAudio.volume = 0;
        slider.value = 0;
    } else {
        fpAudio.volume = fpAudio._prevVol || 1;
        slider.value = fpAudio.volume;
    }
    fpVolume(fpAudio.volume);
}

function fpClose() {
    fpStopSeek();
    if(fpAudio) { fpAudio.pause(); fpAudio.src = ''; fpAudio = null; }
    fpBound = false;
    fpBarDragging = false;
    document.getElementById('footerPlayer').classList.remove('active');
    document.body.classList.remove('footer-open');
    document.getElementById('fpArt').classList.remove('playing');
    
    if (typeof resetLibraryPlayButtons === 'function') {
        resetLibraryPlayButtons();
    }
}

function stopYtPlayer() { fpClose(); }

// --- Player Core ---
function playSong(src, title) {
    if(fpAudio) { fpAudio.pause(); fpAudio.src = ''; }
    fpAudio = new Audio();
    fpAudio.preload = 'auto';
    fpAudio.src = src;
    fpCurrentId = src;
    
    // Ses düzeyini localStorage'dan yükle
    let savedVol = localStorage.getItem('global_volume');
    if (savedVol !== null) {
        fpAudio.volume = parseFloat(savedVol);
        const slider = document.getElementById('fpVolSlider');
        if(slider) slider.value = savedVol;
        
        const icon = document.getElementById('fpVolIcon');
        if(icon) {
            if(savedVol == 0) icon.className = 'fa-solid fa-volume-xmark fp-vol-icon';
            else if(savedVol < 0.5) icon.className = 'fa-solid fa-volume-low fp-vol-icon';
            else icon.className = 'fa-solid fa-volume-high fp-vol-icon';
        }
    }

    const titleEl = document.getElementById('fpTitle');
    if(titleEl) titleEl.textContent = title || 'Şarkı';
    const barEl = document.getElementById('fpBar');
    if(barEl) barEl.style.width = '0%';
    const curEl = document.getElementById('fpCur');
    if(curEl) curEl.textContent = '0:00';
    const durEl = document.getElementById('fpDur');
    if(durEl) durEl.textContent = '0:00';
    const iconEl = document.getElementById('fpPlayIcon');
    if(iconEl) iconEl.className = 'fa-solid fa-spinner fa-spin';
    
    document.getElementById('fpArt')?.classList.remove('playing');
    document.getElementById('footerPlayer')?.classList.add('active');
    document.body.classList.add('footer-open');

    fpBind();

    fpAudio.addEventListener('canplay', function() {
        if(!fpAudio._started) {
            fpAudio._started = true;
            fpAudio.play().catch(() => {
                if(iconEl) iconEl.className = 'fa-solid fa-play';
            });
        }
    }, {once: true});
    fpAudio.load();
}

function playYtVideo(videoId, title) {
    playSong('/api/yt-play/' + videoId, title);
}

function playLocalSong(songId, title) {
    playSong('/api/download/' + songId, title);
}

function fpBind() {
    if(!fpAudio) return;
    const bar = document.getElementById('fpBar');
    const cur = document.getElementById('fpCur');
    const dur = document.getElementById('fpDur');
    const icon = document.getElementById('fpPlayIcon');
    const art = document.getElementById('fpArt');

    fpAudio.ontimeupdate = () => {
        if(!fpAudio) return;
        if(fpAudio.duration && !fpBarDragging) {
            if(bar) bar.style.width = (fpAudio.currentTime / fpAudio.duration * 100) + '%';
            if(cur) cur.textContent = formatTime(fpAudio.currentTime);
        }
    };
    fpAudio.onloadedmetadata = () => {
        if(dur) dur.textContent = formatTime(fpAudio.duration);
    };
    fpAudio.onplay = () => {
        if(icon) icon.className = 'fa-solid fa-pause';
        if(art) art.classList.add('playing');
    };
    fpAudio.onpause = () => {
        if(icon) icon.className = 'fa-solid fa-play';
        if(art) art.classList.remove('playing');
    };
    fpAudio.onended = () => {
        if(icon) icon.className = 'fa-solid fa-play';
        if(art) art.classList.remove('playing');
        if(bar) bar.style.width = '0%';
        if(cur) cur.textContent = '0:00';
    };
}

function fpToggle() {
    if(!fpAudio) return;
    if(fpAudio.paused) {
        fpAudio.play().catch(e => console.warn('Oynatma hatası:', e));
    } else {
        fpAudio.pause();
    }
}

function createPlayer(id, src, theme) {
    const cls = theme === 'dark' ? 'cp-wrap dark' : 'cp-wrap';
    let savedVol = localStorage.getItem('global_volume');
    if(savedVol === null) savedVol = 1;
    
    let iconCls = 'fa-solid fa-volume-high';
    if(savedVol == 0) iconCls = 'fa-solid fa-volume-xmark';
    else if(savedVol < 0.5) iconCls = 'fa-solid fa-volume-low';

    return `
        <div class="${cls}" id="cp-${id}">
            <button class="cp-btn" onclick="cpToggle('${id}')">
                <i class="fa-solid fa-play" id="cp-icon-${id}"></i>
            </button>
            <div class="cp-info">
                <div class="cp-progress-wrap" onclick="cpSeek(event,'${id}')" id="cp-pw-${id}">
                    <div class="cp-progress-bar" id="cp-bar-${id}" style="width:0%"></div>
                </div>
                <div class="cp-time">
                    <span id="cp-cur-${id}">0:00</span>
                    <span id="cp-dur-${id}">0:00</span>
                </div>
            </div>
            <div class="cp-vol">
                <i class="${iconCls} cp-vol-icon" id="cp-volicon-${id}" onclick="cpMute('${id}')"></i>
                <input type="range" class="cp-vol-slider" min="0" max="1" step="0.05" value="${savedVol}" oninput="cpVolume('${id}',this.value)">
            </div>
            <audio id="cp-audio-${id}" src="${src}" preload="none"></audio>
        </div>
    `;
}

function cpBind(id) {
    const audio = document.getElementById('cp-audio-'+id);
    if(!audio || audio._cpBound) return;
    audio._cpBound = true;
    
    let savedVol = localStorage.getItem('global_volume');
    if(savedVol !== null) audio.volume = parseFloat(savedVol);
    
    const bar = document.getElementById('cp-bar-'+id);
    const cur = document.getElementById('cp-cur-'+id);
    const dur = document.getElementById('cp-dur-'+id);
    const icon = document.getElementById('cp-icon-'+id);

    audio.addEventListener('timeupdate', () => {
        if(audio.duration) {
            bar.style.width = (audio.currentTime/audio.duration*100)+'%';
            cur.textContent = formatTime(audio.currentTime);
        }
    });
    audio.addEventListener('loadedmetadata', () => {
        dur.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('play', () => { icon.className = 'fa-solid fa-pause'; });
    audio.addEventListener('pause', () => { icon.className = 'fa-solid fa-play'; });
    audio.addEventListener('ended', () => { icon.className = 'fa-solid fa-play'; bar.style.width = '0%'; cur.textContent = '0:00'; });
}

function cpToggle(id) {
    const audio = document.getElementById('cp-audio-'+id);
    if(!audio) return;
    cpBind(id);
    if(audio.paused) {
        document.querySelectorAll('audio[id^="cp-audio-"]').forEach(a => { if(a!==audio && !a.paused) a.pause(); });
        audio.play().catch(e => console.warn('Oynatma hatası:', e));
    } else {
        audio.pause();
    }
}

function cpSeek(e, id) {
    const audio = document.getElementById('cp-audio-'+id);
    if(!audio || !audio.duration) return;
    const wrap = document.getElementById('cp-pw-'+id);
    const rect = wrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
}

function cpVolume(id, val) {
    localStorage.setItem('global_volume', val);
    const audio = document.getElementById('cp-audio-'+id);
    if(audio) audio.volume = val;
    const icon = document.getElementById('cp-volicon-'+id);
    if(val == 0) icon.className = 'fa-solid fa-volume-xmark cp-vol-icon';
    else if(val < 0.5) icon.className = 'fa-solid fa-volume-low cp-vol-icon';
    else icon.className = 'fa-solid fa-volume-high cp-vol-icon';
}

function cpMute(id) {
    const audio = document.getElementById('cp-audio-'+id);
    if(!audio) return;
    if(audio.volume > 0) { audio._prevVol = audio.volume; audio.volume = 0; }
    else { audio.volume = audio._prevVol || 1; }
    const slider = document.querySelector('#cp-'+id+' .cp-vol-slider');
    if(slider) slider.value = audio.volume;
    cpVolume(id, audio.volume);
}