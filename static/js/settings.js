function openSettings() {
    document.getElementById('settingsModal').classList.remove('hidden');
    loadTokens();
    checkBrowserTokenStatus();
}
function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

async function startBrowserToken() {
    try {
        const resp = await fetch('/api/browser-token/start', {method:'POST'});
        const data = await resp.json();
        if(data.error) { alert(data.error); return; }
        document.getElementById('browserTokenSection').querySelector('button').classList.add('hidden');
        document.getElementById('browserTokenWaiting').classList.remove('hidden');
        browserPollInterval = setInterval(pollBrowserToken, 2000);
    } catch(e) { alert('Hata: ' + e.message); }
}
async function pollBrowserToken() {
    try {
        const resp = await fetch('/api/browser-token/status');
        const data = await resp.json();
        if(data.status === 'done' && data.token) {
            clearInterval(browserPollInterval);
            browserPollInterval = null;
            document.getElementById('browserTokenWaiting').classList.add('hidden');
            document.getElementById('browserTokenSection').querySelector('button').classList.remove('hidden');
            loadTokens();
            if(typeof loadRights === 'function') loadRights();
            alert('Token başarıyla eklendi: ' + data.token.name);
        } else if(data.status === 'error') {
            clearInterval(browserPollInterval);
            browserPollInterval = null;
            document.getElementById('browserTokenWaiting').classList.add('hidden');
            document.getElementById('browserTokenSection').querySelector('button').classList.remove('hidden');
            alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
        } else if(data.status === 'cancelled' || data.status === 'idle') {
            clearInterval(browserPollInterval);
            browserPollInterval = null;
            document.getElementById('browserTokenWaiting').classList.add('hidden');
            document.getElementById('browserTokenSection').querySelector('button').classList.remove('hidden');
        }
    } catch(e) {}
}
async function cancelBrowserToken() {
    await fetch('/api/browser-token/cancel', {method:'POST'});
    if(browserPollInterval) { clearInterval(browserPollInterval); browserPollInterval = null; }
    document.getElementById('browserTokenWaiting').classList.add('hidden');
    document.getElementById('browserTokenSection').querySelector('button').classList.remove('hidden');
}
async function checkBrowserTokenStatus() {
    try {
        const resp = await fetch('/api/browser-token/status');
        const data = await resp.json();
        if(data.status === 'waiting') {
            document.getElementById('browserTokenSection').querySelector('button').classList.add('hidden');
            document.getElementById('browserTokenWaiting').classList.remove('hidden');
            if(!browserPollInterval) browserPollInterval = setInterval(pollBrowserToken, 2000);
        } else {
            document.getElementById('browserTokenWaiting').classList.add('hidden');
            document.getElementById('browserTokenSection').querySelector('button').classList.remove('hidden');
        }
    } catch(e) {}
}

async function loadTokens() {
    const container = document.getElementById('tokenList');
    container.innerHTML = '<div class="flex items-center justify-center py-4"><i class="fa-solid fa-spinner fa-spin text-dark-500"></i></div>';
    try {
        const resp = await fetch('/api/tokens');
        const data = await resp.json();
        if(!data.tokens.length) {
            container.innerHTML = '<div class="text-center py-4 text-dark-500 text-sm">Henüz token eklenmemiş</div>';
            return;
        }
        container.innerHTML = '';
        data.tokens.forEach((t) => {
            const isActive = t.active !== false;
            const masked = t.token.substring(0,10) + '•••' + t.token.substring(t.token.length-8);
            container.innerHTML += `
                <div class="bg-dark-800/60 rounded-xl p-3 border ${isActive ? 'border-green-500/40' : 'border-dark-700/50 opacity-60'} transition">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 ${isActive ? 'bg-green-500/20' : 'bg-dark-700'} rounded-lg flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid ${isActive ? 'fa-check text-green-400' : 'fa-pause text-dark-500'} text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium flex items-center gap-2">
                                ${t.name}
                                ${isActive ? '<span class="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded-full">Aktif</span>' : '<span class="bg-dark-700 text-dark-500 text-[10px] px-1.5 py-0.5 rounded-full">Pasif</span>'}
                            </div>
                            <div class="text-xs text-dark-500 font-mono truncate">${masked}</div>
                        </div>
                        <div class="flex gap-1 flex-shrink-0">
                            <button onclick="toggleToken('${t.id}')" class="w-7 h-7 rounded-lg ${isActive ? 'bg-green-500/10 hover:bg-green-500/20' : 'bg-dark-700 hover:bg-green-500/20'} flex items-center justify-center transition" title="${isActive ? 'Pasif Yap' : 'Aktif Yap'}">
                                <i class="fa-solid fa-power-off text-xs ${isActive ? 'text-green-400' : 'text-dark-500 hover:text-green-400'}"></i>
                            </button>
                            <button onclick="openEditModal('${t.id}')" class="w-7 h-7 rounded-lg bg-dark-700 hover:bg-indigo-500/20 flex items-center justify-center transition" title="Düzenle">
                                <i class="fa-solid fa-pen text-xs text-dark-400 hover:text-indigo-400"></i>
                            </button>
                            <button onclick="deleteToken('${t.id}')" class="w-7 h-7 rounded-lg bg-dark-700 hover:bg-red-500/20 flex items-center justify-center transition" title="Sil">
                                <i class="fa-solid fa-trash text-xs text-dark-400 hover:text-red-400"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch(e) {
        container.innerHTML = `<div class="text-red-400 text-sm text-center py-4">${e.message}</div>`;
    }
}
async function toggleToken(id) {
    await fetch('/api/tokens/toggle/'+id, {method:'POST'});
    loadTokens();
    if(typeof loadRights === 'function') loadRights();
}
function openEditModal(id) {
    editingTokenId = id;
    fetch('/api/tokens').then(r=>r.json()).then(data=>{
        const t = data.tokens.find(x=>x.id===id);
        if(!t) return;
        document.getElementById('editTokenName').value = t.name;
        document.getElementById('editTokenValue').value = t.token;
        document.getElementById('editTokenModal').classList.remove('hidden');
    });
}
function closeEditModal() {
    editingTokenId = null;
    document.getElementById('editTokenModal').classList.add('hidden');
}
async function saveEditToken() {
    if(!editingTokenId) return;
    const name = document.getElementById('editTokenName').value.trim();
    const token = document.getElementById('editTokenValue').value.trim();
    if(!token) return;
    await fetch('/api/tokens/'+editingTokenId, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name, token})
    });
    closeEditModal();
    loadTokens();
    if(typeof loadRights === 'function') loadRights();
}
async function addToken() {
    const name = document.getElementById('newTokenName').value.trim();
    const token = document.getElementById('newTokenValue').value.trim();
    if(!token) return;
    await fetch('/api/tokens', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name, token})
    });
    document.getElementById('newTokenName').value = '';
    document.getElementById('newTokenValue').value = '';
    loadTokens();
    if(typeof loadRights === 'function') loadRights();
}
async function deleteToken(id) {
    if(!confirm('Bu token silinsin mi?')) return;
    await fetch('/api/tokens/'+id, {method:'DELETE'});
    loadTokens();
    if(typeof loadRights === 'function') loadRights();
}