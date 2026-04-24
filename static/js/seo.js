/* ===== YOUTUBE VIDEO SEO OPTIMIZER ===== */
async function optimizeVideoSEO(videoId, title, containerId) {
    const container = document.getElementById(containerId);
    container.classList.remove('hidden');
    container.innerHTML = '<div class="flex items-center justify-center py-3"><i class="fa-solid fa-spinner fa-spin text-amber-400 mr-2"></i><span class="text-xs text-dark-400">Viral SEO analiz ediliyor... (2dk max)</span></div>';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 130000);

    try {
        const resp = await fetch('/api/optimize-video-seo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title: title}),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await resp.json();

        if(data.ok) {
            const safeTitle = (data.title||'').replace(/"/g,'&quot;');
            const safeDesc = (data.description||'').replace(/"/g,'&quot;');
            const safeTags = (data.tags||'').replace(/"/g,'&quot;');
            container.innerHTML = `
                <div class="bg-dark-900/60 rounded-lg p-3 border border-amber-500/20 space-y-2">
                    <div>
                        <label class="text-[10px] font-semibold text-amber-400 mb-1 block"><i class="fa-solid fa-heading mr-1"></i>Başlık (düzenleyebilirsin)</label>
                        <input type="text" id="seo-title-${videoId}" value="${safeTitle}" class="w-full bg-dark-800/50 border border-dark-600 rounded-lg px-2 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-semibold text-amber-400 mb-1 block"><i class="fa-solid fa-align-left mr-1"></i>Açıklama (düzenleyebilirsin)</label>
                        <textarea id="seo-desc-${videoId}" rows="4" class="w-full bg-dark-800/50 border border-dark-600 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-amber-500 focus:outline-none resize-y">${safeDesc}</textarea>
                    </div>
                    <div>
                        <label class="text-[10px] font-semibold text-amber-400 mb-1 block"><i class="fa-solid fa-tags mr-1"></i>Etiketler (düzenleyebilirsin)</label>
                        <textarea id="seo-tags-${videoId}" rows="2" class="w-full bg-dark-800/50 border border-dark-600 rounded-lg px-2 py-1.5 text-[11px] text-white focus:border-amber-500 focus:outline-none resize-none">${safeTags}</textarea>
                    </div>
                    <button id="seo-apply-${videoId}" onclick="applyVideoSEO('${videoId}')" class="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all btn-glow">
                        <i class="fa-solid fa-check"></i> Uygula (YouTube'da Güncelle)
                    </button>
                </div>`;
        } else {
            container.innerHTML = `<div class="text-xs text-red-400 py-2">${data.error || 'Hata'}</div>`;
        }
    } catch(e) {
        clearTimeout(timeout);
        const msg = e.name === 'AbortError' ? 'Zaman aşımı (2dk)' : e.message;
        container.innerHTML = `
            <div class="text-center py-2">
                <div class="text-xs text-red-400 mb-2">${msg}</div>
                <button onclick="optimizeVideoSEO('${videoId}','${title.replace(/'/g,"\\'").replace(/"/g,"&quot;")}','${containerId}')" class="bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white">
                    <i class="fa-solid fa-rotate-right mr-1"></i> Tekrar Dene
                </button>
            </div>`;
    }
}

async function applyVideoSEO(videoId) {
    const btn = document.getElementById('seo-apply-' + videoId);
    const title = document.getElementById('seo-title-' + videoId).value.trim();
    const desc = document.getElementById('seo-desc-' + videoId).value.trim();
    const tags = document.getElementById('seo-tags-' + videoId).value.trim();

    if(!title) { alert('Başlık boş olamaz'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Güncelleniyor...';

    try {
        const resp = await fetch('/api/update-video-seo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({video_id: videoId, title, description: desc, tags})
        });
        const data = await resp.json();

        if(data.ok) {
            btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Başarıyla Güncellendi!';
            btn.classList.replace('from-green-600', 'from-emerald-700');
            btn.classList.replace('to-emerald-600', 'to-emerald-700');
        } else {
            btn.innerHTML = '<i class="fa-solid fa-xmark mr-1"></i> ' + (data.error || 'Hata');
            btn.classList.add('bg-red-600');
            btn.disabled = false;
        }
    } catch(e) {
        btn.innerHTML = '<i class="fa-solid fa-xmark mr-1"></i> ' + e.message;
        btn.classList.add('bg-red-600');
        btn.disabled = false;
    }
}