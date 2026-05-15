/* ===== STYLE MANAGER LOGIC (SERVER-SIDE JSON + EDIT SUPPORT) ===== */

let styleLibrary = [];
let editingStyleIndex = null;

// Initialize and Load Library
document.addEventListener('DOMContentLoaded', () => {
    loadStyleLibrary();
});

async function loadStyleLibrary() {
    try {
        const resp = await fetch('/api/styles');
        const data = await resp.json();
        if (Array.isArray(data)) {
            styleLibrary = data;
            console.log("[STYLE] Loaded", styleLibrary.length, "styles from server.");
        } else {
            console.error("[STYLE] Failed to load styles:", data.error);
        }
    } catch (e) {
        console.error("[STYLE] Network error loading styles:", e);
    }
}

async function saveStyleLibrary() {
    try {
        const resp = await fetch('/api/styles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(styleLibrary)
        });
        const data = await resp.json();
        if (!data.ok) {
            console.error("[STYLE] Failed to save styles:", data.error);
        }
    } catch (e) {
        console.error("[STYLE] Network error saving styles:", e);
    }
}

// Modal Handlers
function openStyleManager() {
    const modal = document.getElementById('styleModal');
    if (!modal) return;
    
    // Always refresh from server when opening
    loadStyleLibrary().then(() => {
        renderStyleLibrary();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
            modal.querySelector('div').classList.add('scale-100', 'opacity-100');
        }, 10);
    });
}

function closeStyleManager() {
    const modal = document.getElementById('styleModal');
    if (!modal) return;
    
    modal.querySelector('div').classList.add('scale-95', 'opacity-0');
    modal.querySelector('div').classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

function promptSaveStyle() {
    const styleVal = document.getElementById('songStyle').value.trim();
    if (!styleVal) {
        alert("Önce kaydetmek için bir stil promptu yazmalısın.");
        return;
    }
    
    editingStyleIndex = null; // We are creating a NEW style
    
    const modal = document.getElementById('saveStyleModal');
    if (!modal) return;

    // Reset UI for "New" mode
    document.getElementById('styleModalTitle').innerHTML = '<i class="fa-solid fa-circle-plus text-emerald-500"></i> Yeni Stili Kaydet';
    document.getElementById('saveStyleBtn').textContent = 'Kütüphaneye Ekle';
    document.getElementById('newStyleTitle').value = '';
    document.getElementById('newStylePrompt').value = styleVal;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('newStyleTitle').focus();
    setTimeout(() => {
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
        modal.querySelector('div').classList.add('scale-100', 'opacity-100');
    }, 10);
}

function editStyle(index, event) {
    if (event) event.stopPropagation();
    const item = styleLibrary[index];
    if (!item) return;

    editingStyleIndex = index; // We are EDITING an existing style
    
    const modal = document.getElementById('saveStyleModal');
    if (!modal) return;

    // Set UI for "Edit" mode
    document.getElementById('styleModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-400"></i> Stili Düzenle';
    document.getElementById('saveStyleBtn').textContent = 'Değişiklikleri Kaydet';
    document.getElementById('newStyleTitle').value = item.title;
    document.getElementById('newStylePrompt').value = item.prompt;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('newStyleTitle').focus();
    setTimeout(() => {
        modal.querySelector('div').classList.remove('scale-95', 'opacity-0');
        modal.querySelector('div').classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeSaveStyle() {
    const modal = document.getElementById('saveStyleModal');
    if (!modal) return;
    
    modal.querySelector('div').classList.add('scale-95', 'opacity-0');
    modal.querySelector('div').classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 200);
}

async function saveStyleToLibrary() {
    const title = document.getElementById('newStyleTitle').value.trim();
    const prompt = document.getElementById('newStylePrompt').value.trim();
    
    if (!title) {
        alert("Lütfen bir başlık girin.");
        return;
    }
    if (!prompt) {
        alert("Prompt içeriği boş olamaz.");
        return;
    }
    
    if (editingStyleIndex !== null) {
        // UPDATE EXISTING
        styleLibrary[editingStyleIndex] = { title, prompt };
        console.log("[STYLE] Updated style at index", editingStyleIndex);
    } else {
        // ADD NEW
        styleLibrary.unshift({ title, prompt });
        console.log("[STYLE] Added new style to library");
    }
    
    await saveStyleLibrary();
    closeSaveStyle();
    
    // Refresh lists
    renderStyleLibrary();
}

async function deleteStyle(index, event) {
    if (event) event.stopPropagation();
    if (!confirm("Bu stili kütüphaneden silmek istediğine emin misin?")) return;
    
    styleLibrary.splice(index, 1);
    await saveStyleLibrary();
    renderStyleLibrary();
}

function selectStyle(index) {
    // Only allow selection if the song editing panel (Panel 2) is active
    const panel2 = document.getElementById('panel2');
    if (!panel2 || panel2.classList.contains('hidden')) {
        console.log("[STYLE] Not in editing panel, selection disabled.");
        return;
    }

    const item = styleLibrary[index];
    if (item) {
        document.getElementById('songStyle').value = item.prompt;
        closeStyleManager();
        
        // Visual feedback on the input
        const input = document.getElementById('songStyle');
        input.classList.add('ring-2', 'ring-indigo-500/50');
        setTimeout(() => input.classList.remove('ring-2', 'ring-indigo-500/50'), 1000);
    }
}

function renderStyleLibrary() {
    const list = document.getElementById('styleLibraryList');
    if (!list) return;
    
    if (styleLibrary.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12">
                <i class="fa-solid fa-folder-open text-3xl text-zinc-800 mb-4"></i>
                <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Henüz kayıtlı stil yok</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = styleLibrary.map((item, index) => `
        <div onclick="selectStyle(${index})" class="group bg-zinc-900/40 border border-zinc-900 hover:border-zinc-700/50 hover:bg-zinc-900 p-4 rounded-xl cursor-pointer transition-all relative overflow-hidden">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase tracking-[0.15em] text-white group-hover:text-indigo-400 transition-colors">${item.title}</span>
                <div class="flex gap-1">
                    <button onclick="editStyle(${index}, event)" class="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400 text-zinc-600 transition-all">
                        <i class="fa-solid fa-pen-to-square text-[10px]"></i>
                    </button>
                    <button onclick="deleteStyle(${index}, event)" class="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-500 text-zinc-600 transition-all">
                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
                </div>
            </div>
            <p class="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 italic font-mono">${item.prompt}</p>
            <div class="absolute right-0 top-0 bottom-0 w-0.5 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    `).join('');
}
