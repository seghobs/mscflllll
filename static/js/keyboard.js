/* ===== KEYBOARD SHORTCUTS ===== */
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        if (typeof toggleQueuePanel === 'function') toggleQueuePanel();
        return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (typeof openStyleManager === 'function') openStyleManager();
        return;
    }

    // Ignore other shortcuts if typing in input/textarea
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if(!fpAudio) return;

    const skip = e.shiftKey ? 10 : 5;

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            fpAudio.currentTime = Math.max(0, fpAudio.currentTime - skip);
            break;
        case 'ArrowRight':
            e.preventDefault();
            fpAudio.currentTime = Math.min(fpAudio.duration || 0, fpAudio.currentTime + skip);
            break;
        case ' ':
            e.preventDefault();
            fpToggle();
            break;
        case 'm':
        case 'M':
            e.preventDefault();
            fpMute();
            break;
        case '+':
        case '=':
            e.preventDefault();
            if(fpAudio) {
                fpAudio.volume = Math.min(1, fpAudio.volume + 0.1);
                document.getElementById('fpVolSlider').value = fpAudio.volume;
                fpVolume(fpAudio.volume);
            }
            break;
        case '-':
            e.preventDefault();
            if(fpAudio) {
                fpAudio.volume = Math.max(0, fpAudio.volume - 0.1);
                document.getElementById('fpVolSlider').value = fpAudio.volume;
                fpVolume(fpAudio.volume);
            }
            break;
    }
});