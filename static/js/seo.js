/* ===== YOUTUBE VIDEO SEO OPTIMIZER ===== */
async function optimizeVideoSEO(videoId, title, containerId) {
    const container = document.getElementById(containerId);
    container.classList.remove('hidden');
    container.innerHTML = '<div class="flex items-center justify-center py-4 bg-zinc-950 border border-zinc-900 rounded-lg"><i class="fa-solid fa-spinner fa-spin text-zinc-500 mr-3"></i><span class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Viral SEO analiz ediliyor...</span></div>';

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
                <div class="shadcn-card p-4 space-y-4">
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block"><i class="fa-solid fa-heading mr-1.5"></i>Önerilen Başlık</label>
                        <input type="text" id="seo-title-${videoId}" value="${safeTitle}" class="shadcn-input px-3 py-2 text-xs font-medium">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block"><i class="fa-solid fa-align-left mr-1.5"></i>Viral Açıklama</label>
                        <textarea id="seo-desc-${videoId}" rows="5" class="shadcn-input px-3 py-2 text-[11px] leading-relaxed resize-y">${safeDesc}</textarea>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block"><i class="fa-solid fa-tags mr-1.5"></i>SEO Etiketleri</label>
                        <textarea id="seo-tags-${videoId}" rows="2" class="shadcn-input px-3 py-2 text-[11px] leading-relaxed resize-none">${safeTags}</textarea>
                    </div>
                    <button id="seo-apply-${videoId}" onclick="applyVideoSEO('${videoId}')" class="shadcn-button-primary w-full py-3 text-[10px] flex items-center justify-center gap-2">
                        <i class="fa-solid fa-check"></i> YouTube Verilerini Güncelle
                    </button>
                </div>`;
        } else {
            container.innerHTML = `<div class="bg-zinc-950 border border-red-900/50 p-4 rounded-lg text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">${data.error || 'SEO analizi başarısız'}</div>`;
        }
    } catch(e) {
        clearTimeout(timeout);
        const msg = e.name === 'AbortError' ? 'Zaman aşımı (2dk)' : e.message;
        container.innerHTML = `
            <div class="text-center p-4 bg-zinc-950 border border-zinc-900 rounded-lg">
                <div class="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-3">${msg}</div>
                <button onclick="optimizeVideoSEO('${videoId}','${title.replace(/'/g,"\\'").replace(/"/g,"&quot;")}','${containerId}')" class="shadcn-button-secondary px-4 py-2 text-[10px] mx-auto">
                    <i class="fa-solid fa-rotate-right mr-1.5"></i> Yeniden Dene
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> GÜNCELLENİYOR...';

    try {
        const resp = await fetch('/api/update-video-seo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({video_id: videoId, title, description: desc, tags})
        });
        const data = await resp.json();

        if(data.ok) {
            btn.innerHTML = '<i class="fa-solid fa-check mr-1.5"></i> BAŞARIYLA GÜNCELLENDİ!';
            btn.className = "shadcn-button-primary w-full py-3 text-[10px] flex items-center justify-center gap-2 opacity-100 bg-zinc-800";
        } else {
            btn.innerHTML = '<i class="fa-solid fa-xmark mr-1.5"></i> ' + (data.error || 'HATA');
            btn.className = "shadcn-button-primary w-full py-3 text-[10px] flex items-center justify-center gap-2 bg-red-600";
            btn.disabled = false;
        }
    } catch(e) {
        btn.innerHTML = '<i class="fa-solid fa-xmark mr-1.5"></i> ' + e.message;
        btn.className = "shadcn-button-primary w-full py-3 text-[10px] flex items-center justify-center gap-2 bg-red-600";
        btn.disabled = false;
    }
}