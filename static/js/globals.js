function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function formatTime(s) {
    if(!s || isNaN(s)) return '0:00';
    const m = Math.floor(s/60);
    const sec = Math.floor(s%60);
    return m + ':' + (sec<10?'0':'') + sec;
}
let state = { audioId: null, title: '', lyrics: '', style: 'Guitar,Piano', songIds: [], results: [] };
let knownSongs = {};
let activeTaskCounter = 0;
const activeTasks = {};
const taskStartTimes = {};

// Persist active tasks to localStorage so new tabs / refreshes can restore queue
function saveActiveTasks() {
    try {
        localStorage.setItem('musicful_active_tasks', JSON.stringify(activeTasks));
    } catch(e) {}
}

function loadActiveTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem('musicful_active_tasks') || '{}');
        Object.assign(activeTasks, saved);
        // Record start times so elapsed timer works
        Object.keys(activeTasks).forEach(id => {
            if (!taskStartTimes[id]) taskStartTimes[id] = Date.now();
        });
    } catch(e) {}
}

// Cross-check restored tasks against the server queue; purge completed/stale ones
function _verifyRestoredTasks() {
    if (Object.keys(activeTasks).length === 0) return;
    fetch('/api/queue').then(r => r.json()).then(data => {
        const serverTaskIds = new Set((data.tasks || []).filter(t => t.status === 'running' || t.status === 'pending').map(t => t.id));
        let changed = false;
        Object.keys(activeTasks).forEach(id => {
            if (!serverTaskIds.has(id)) {
                delete activeTasks[id];
                changed = true;
            }
        });
        if (changed) saveActiveTasks();
    }).catch(() => {});
}
// Update the live sub-step label shown in the Queue panel for a given task id
function updateTaskPhase(taskId, phase) {
    if (!activeTasks[taskId]) return;
    activeTasks[taskId].phase = phase;
    // no need to persist to localStorage – phase is ephemeral
}
let fpAudio = null;
let fpBound = false;
let fpCurrentId = null;
let fpSeekTimer = null;
let fpSeekAccel = 0;
let fpBarDragging = false;
let videoSongId = '';
let activeVideoTaskId = null;
let selectedAiCover = null;
let activeVideoIdForUpload = null;
let ytSearchTimeout = null;
let ytCurrentQuery = '';
let ytCurrentPage = 1;
let browserPollInterval = null;
let editingTokenId = null;
let ctxSong = {};

function goToStep(n) {
    if(n>=2) {
        state.title = document.getElementById('songTitle').value;
        state.lyrics = document.getElementById('songLyrics').value;
        state.style = document.getElementById('songStyle').value;
    }
    if(n===3) {
        document.getElementById('confirmTitle').textContent = state.title;
        document.getElementById('confirmStyle').textContent = state.style;
        document.getElementById('confirmLyrics').textContent = state.lyrics;
    }
    for(let i=1;i<=4;i++) {
        const panel = document.getElementById('panel'+i);
        const step = document.getElementById('step'+i);
        if(!panel) continue;
        panel.classList.toggle('hidden', i!==n);
        step.classList.remove('border-indigo-500/50','border-green-500/50');
        step.classList.toggle('opacity-40', i>n);
        if(i<n) step.classList.add('border-green-500/50');
        if(i===n) step.classList.add('border-indigo-500/50');
    }

    if (n === 2 && typeof saveDraftState === 'function') {
        saveDraftState('active_cover', {
            type: 'cover',
            audioId: state.audioId,
            songTitle: document.getElementById('songTitle').value,
            songStyle: document.getElementById('songStyle').value,
            songLyrics: document.getElementById('songLyrics').value
        });
    }
}
function setStyle(s) { 
    document.getElementById('songStyle').value = s; 
    if(typeof saveDraftState === 'function') {
        saveDraftState('active_cover', { songStyle: s });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ['songTitle', 'songLyrics', 'songStyle'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
            if(typeof saveDraftState === 'function') {
                saveDraftState('active_cover', {
                    type: 'cover',
                    audioId: state.audioId,
                    songTitle: document.getElementById('songTitle').value,
                    songStyle: document.getElementById('songStyle').value,
                    songLyrics: document.getElementById('songLyrics').value
                });
            }
        });
    });
});