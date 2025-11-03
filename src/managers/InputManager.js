export class InputManager {
    constructor(scene, pacman) {
        this.scene = scene;
        this.pacman = pacman;
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.remoteDirection = null;
        this.setupSocket();
    }

    setupSocket() {
        this.scene.socket = io();
        this.scene.socket.on('game-control', (data) => {
            if (data.pressed) {
                this.remoteDirection = data.direction;
            }
        });
    }

    handleDirectionInput() {
        const arrowKeys = ["left", "right", "up", "down"];
        for (const key of arrowKeys) {
            if (this.cursors[key].isDown) {
                if (this.pacman.direction !== key) {
                    this.pacman.setDirection(key);
                    break;
                }
            }
        }
    }

    handleRemoteInput() {
        if (this.remoteDirection) {
            const key = this.remoteDirection; // 'left', 'right', 'up', or 'down'

            // Set Pac-Man's next direction
            if (this.pacman.direction !== key) {
                this.pacman.setDirection(key);
            }
            
            // We've used the input, so clear it
            this.remoteDirection = null; 
        }
    }

    update() {
        this.handleDirectionInput();
        this.handleRemoteInput();
    }

    // Method to manually set direction (for testing or other input methods)
    setDirection(direction) {
        this.pacman.setDirection(direction);
    }

    // Get current input state (for debugging)
    getInputState() {
        return {
            keyboard: {
                left: this.cursors.left.isDown,
                right: this.cursors.right.isDown,
                up: this.cursors.up.isDown,
                down: this.cursors.down.isDown
            },
            remote: this.remoteDirection
        };
    }

    // Clean up method
    destroy() {
        if (this.scene.socket) {
            this.scene.socket.disconnect();
        }
    }
}