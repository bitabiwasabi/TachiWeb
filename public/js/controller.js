// Controller/Gamepad Support
class ControllerManager {
    constructor() {
        this.controllers = {};
        this.mapping = {
            prevPage: 4,  // L1/LB
            nextPage: 5,  // R1/RB
            toggleInfo: 0, // A/X
            pageInfo: 3   // Y/Triangle
        };
        
        this.pollInterval = null;
        this.loadMapping();
        this.init();
    }

    init() {
        window.addEventListener('gamepadconnected', (e) => this.onConnect(e));
        window.addEventListener('gamepaddisconnected', (e) => this.onDisconnect(e));
        
        // Start polling if controllers already connected
        this.checkForControllers();
    }

    loadMapping() {
        const settings = window.repoManager?.getSettings();
        if (settings?.controllerMapping) {
            this.mapping = { ...this.mapping, ...settings.controllerMapping };
        }
    }

    saveMapping() {
        if (window.repoManager) {
            window.repoManager.updateSettings({ controllerMapping: this.mapping });
        }
    }

    onConnect(e) {
        console.log('Controller connected:', e.gamepad.id);
        this.controllers[e.gamepad.index] = e.gamepad;
        
        if (!this.pollInterval) {
            this.startPolling();
        }
        
        this.dispatchEvent('controllerconnected', { controller: e.gamepad });
    }

    onDisconnect(e) {
        console.log('Controller disconnected:', e.gamepad.id);
        delete this.controllers[e.gamepad.index];
        
        if (Object.keys(this.controllers).length === 0) {
            this.stopPolling();
        }
        
        this.dispatchEvent('controllerdisconnected', { controller: e.gamepad });
    }

    checkForControllers() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gamepad of gamepads) {
            if (gamepad) {
                this.controllers[gamepad.index] = gamepad;
            }
        }
        
        if (Object.keys(this.controllers).length > 0) {
            this.startPolling();
        }
    }

    startPolling() {
        this.prevButtonStates = {};
        this.pollInterval = setInterval(() => this.poll(), 16); // ~60fps
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    poll() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        for (const gamepad of gamepads) {
            if (!gamepad) continue;
            
            this.controllers[gamepad.index] = gamepad;
            
            // Check button presses
            gamepad.buttons.forEach((button, index) => {
                const prevState = this.prevButtonStates[`${gamepad.index}-${index}`];
                const isPressed = button.pressed;
                
                if (isPressed && !prevState) {
                    this.onButtonPress(gamepad, index);
                }
                
                this.prevButtonStates[`${gamepad.index}-${index}`] = isPressed;
            });
        }
    }

    onButtonPress(gamepad, buttonIndex) {
        const reader = window.bookReader;
        if (!reader?.isOpen) return;
        
        if (buttonIndex === this.mapping.prevPage) {
            reader.prevPage();
        } else if (buttonIndex === this.mapping.nextPage) {
            reader.nextPage();
        } else if (buttonIndex === this.mapping.toggleInfo) {
            reader.toggleUI();
        } else if (buttonIndex === this.mapping.pageInfo) {
            reader.showPageInfo();
            // Auto-hide after 2 seconds
            setTimeout(() => reader.hidePageInfo(), 2000);
        }
    }

    setMapping(action, buttonIndex) {
        if (this.mapping.hasOwnProperty(action)) {
            this.mapping[action] = buttonIndex;
            this.saveMapping();
        }
    }

    getMapping() {
        return { ...this.mapping };
    }

    getConnectedControllers() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        return Array.from(gamepads).filter(g => g !== null).map(g => ({
            index: g.index,
            id: g.id,
            buttons: g.buttons.length,
            axes: g.axes.length
        }));
    }

    dispatchEvent(name, detail) {
        window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    // Button name mappings (Standard Gamepad Layout)
    getButtonName(index) {
        const names = {
            0: 'A / Cross',
            1: 'B / Circle',
            2: 'X / Square',
            3: 'Y / Triangle',
            4: 'L1 / LB',
            5: 'R1 / RB',
            6: 'L2 / LT',
            7: 'R2 / RT',
            8: 'Select / Share',
            9: 'Start / Options',
            10: 'L3 (Left Stick)',
            11: 'R3 (Right Stick)',
            12: 'D-Pad Up',
            13: 'D-Pad Down',
            14: 'D-Pad Left',
            15: 'D-Pad Right',
            16: 'Home / PS'
        };
        return names[index] || `Button ${index}`;
    }
}

// Initialize global instance
window.ControllerManager = ControllerManager;
