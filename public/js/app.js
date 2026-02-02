// Main App Controller
class App {
    constructor() {
        this.init();
    }

    init() {
        // Initialize hotkeys on all pages
        if (window.HotkeyManager) {
            window.hotkeyManager = new HotkeyManager();
        }

        // Initialize controller support
        if (window.ControllerManager) {
            window.controllerManager = new ControllerManager();
        }

        // Setup keyboard shortcut help
        this.setupHelpModal();
    }

    setupHelpModal() {
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && !e.target.matches('input, textarea')) {
                this.showShortcutsHelp();
            }
        });
    }

    showShortcutsHelp() {
        const existing = document.querySelector('.shortcuts-modal');
        if (existing) {
            existing.remove();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active shortcuts-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Keyboard Shortcuts</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="shortcuts-list">
                    <div class="shortcut-item">
                        <kbd>?</kbd>
                        <span>Toggle this help</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Tab</kbd>
                        <span>Show page info (in reader)</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Q</kbd>
                        <span>Previous page</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>E</kbd>
                        <span>Next page</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Space</kbd>
                        <span>Toggle book info</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Esc</kbd>
                        <span>Close reader/modal</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
