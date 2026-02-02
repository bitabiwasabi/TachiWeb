// Hotkey Manager
class HotkeyManager {
    constructor() {
        this.hotkeys = {
            pageInfo: 'Tab',
            prevPage: 'KeyQ',
            nextPage: 'KeyE',
            toggleInfo: 'Space'
        };
        
        this.loadHotkeys();
        this.bindEvents();
    }

    loadHotkeys() {
        const settings = window.repoManager?.getSettings();
        if (settings?.hotkeys) {
            this.hotkeys = { ...this.hotkeys, ...settings.hotkeys };
        }
    }

    saveHotkeys() {
        if (window.repoManager) {
            window.repoManager.updateSettings({ hotkeys: this.hotkeys });
        }
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        document.addEventListener('keyup', (e) => this.handleKeyup(e));
    }

    handleKeydown(e) {
        // Ignore if typing in input
        if (e.target.matches('input, textarea, select')) return;
        
        const reader = window.bookReader;
        if (!reader?.isOpen) return;
        
        const key = e.code || e.key;
        
        if (key === this.hotkeys.prevPage || key === 'KeyQ') {
            e.preventDefault();
            reader.prevPage();
        } else if (key === this.hotkeys.nextPage || key === 'KeyE') {
            e.preventDefault();
            reader.nextPage();
        } else if (key === this.hotkeys.toggleInfo || key === 'Space') {
            e.preventDefault();
            reader.toggleUI();
        } else if (key === this.hotkeys.pageInfo || key === 'Tab') {
            e.preventDefault();
            reader.showPageInfo();
        } else if (key === 'Escape') {
            reader.close();
        }
    }

    handleKeyup(e) {
        const reader = window.bookReader;
        if (!reader?.isOpen) return;
        
        const key = e.code || e.key;
        
        if (key === this.hotkeys.pageInfo || key === 'Tab') {
            reader.hidePageInfo();
        }
    }

    setHotkey(action, key) {
        if (this.hotkeys.hasOwnProperty(action)) {
            this.hotkeys[action] = key;
            this.saveHotkeys();
        }
    }

    getHotkeys() {
        return { ...this.hotkeys };
    }

    getKeyName(code) {
        const keyNames = {
            'Tab': 'Tab',
            'Space': 'Space',
            'KeyQ': 'Q',
            'KeyE': 'E',
            'KeyW': 'W',
            'KeyA': 'A',
            'KeyS': 'S',
            'KeyD': 'D',
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'ArrowUp': '↑',
            'ArrowDown': '↓'
        };
        return keyNames[code] || code;
    }
}

// Initialize global instance
window.HotkeyManager = HotkeyManager;
