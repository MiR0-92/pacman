import { Ghost } from '../entities/Ghost.js';
import { GAME_CONSTANTS } from '../utils/Constants.js';


export class GhostManager {
    constructor(scene) {
        this.scene = scene;
        this.ghosts = [];
        this.ghostSpeed = scene.pacman.speed * 0.7;
        this.initializeGhosts();
    }

    initializeGhosts() {
        // Create ghost instances
        this.pinkGhost = new Ghost(this.scene, 232, 280, "pinkGhost", "pinky");
        this.orangeGhost = new Ghost(this.scene, 210, 280, "orangeGhost", "clyde");
        this.redGhost = new Ghost(this.scene, 220, 280, "redGhost", "blinky");
        this.blueGhost = new Ghost(this.scene, 255, 280, "blueGhost", "inky");
        
        this.ghosts = [this.pinkGhost, this.orangeGhost, this.redGhost, this.blueGhost];
        
        // Set up initial paths for scatter mode
        let startPoint = { x: 232, y: 240 };
        
        this.updateGhostPath(this.pinkGhost, GAME_CONSTANTS.SCATTER_TARGETS.PINKY);
        this.updateGhostPath(this.blueGhost, GAME_CONSTANTS.SCATTER_TARGETS.INKY);
        this.updateGhostPath(this.orangeGhost, GAME_CONSTANTS.SCATTER_TARGETS.CLYDE);
        this.updateGhostPath(this.redGhost, GAME_CONSTANTS.SCATTER_TARGETS.BLINKY);
        
        this.startGhostEntries();
    }

    startGhostEntries() {
        this.ghosts.forEach((ghost, index) => {
            setTimeout(() => {
                this.enterMaze(ghost);
            }, GAME_CONSTANTS.ENTRY_DELAY * index);
        });
    }

    enterMaze(ghost) {
        ghost.enterMaze(232, 240);
    }

    updateGhostPath(ghost, target) {
        let chaseStartPoint = { x: ghost.sprite.x, y: ghost.sprite.y };

        if (this.scene.pathfindingManager.isInGhostHouse(ghost.sprite.x, ghost.sprite.y)) {
            chaseStartPoint = { x: 232, y: 240 };
        }
        
        ghost.path = this.scene.pathfindingManager.aStarAlgorithm(chaseStartPoint, target);
        if (ghost.path.length > 0) {
            ghost.nextIntersection = ghost.path.shift();
        }
    }

    setGhostsToScaredMode() {
        this.ghosts.forEach(ghost => {
            let scaredTarget = ghost.getScaredTarget();
            this.updateGhostPath(ghost, scaredTarget);
            
            if (ghost.blinkInterval) {
                clearInterval(ghost.blinkInterval);
            }
            
            const blinkTime = GAME_CONSTANTS.SCARED_MODE_DURATION - 2000;
            ghost.blinkInterval = setTimeout(() => {
                if (ghost.hasBeenEaten) return;

                ghost.startBlinking();
            }, blinkTime);
            
            ghost.setScared();
            ghost.hasBeenEaten = false;
        });
        
        this.ghostSpeed = GAME_CONSTANTS.PACMAN_SPEED * 0.5; // Slower when scared
    }

    setGhostsToNormalMode() {
        this.ghosts.forEach(ghost => {
            ghost.stopBlinking();
            ghost.setNormal();
            
            let target = this.scene.gameManager.currentMode === "chase" 
                ? ghost.getChaseTarget(this.scene.pacman, this.getBlinky()) 
                : ghost.getScatterTarget();
            this.updateGhostPath(ghost, target);
            
            ghost.hasBeenEaten = true;
        });
        
        this.ghostSpeed = GAME_CONSTANTS.PACMAN_SPEED * 0.7; // Back to normal speed
    }

    resetGhosts() {
        // Reset positions
        this.redGhost.sprite.setPosition(232, 290);
        this.pinkGhost.sprite.setPosition(220, 290);
        this.blueGhost.sprite.setPosition(255, 290);
        this.orangeGhost.sprite.setPosition(210, 290);
        
        this.ghosts = [this.pinkGhost, this.redGhost, this.orangeGhost, this.blueGhost];
        
        // Reset ghost states
        this.ghosts.forEach(ghost => {
            ghost.setNormal();
            ghost.hasBeenEaten = true;
            ghost.enteredMaze = false;
            ghost.stopBlinking();
            
            let target = ghost.getScatterTarget();
            this.updateGhostPath(ghost, target);
            ghost.direction = "left";
            ghost.previousDirection = "left";
        });
        
        this.startGhostEntries();
        this.ghostSpeed = GAME_CONSTANTS.PACMAN_SPEED * 0.7;
    }

    respawnGhost(ghost) {
        ghost.respawn(232, 290);
        this.enterMaze(ghost);
        
        let target = this.scene.gameManager.currentMode === "chase" 
            ? ghost.getChaseTarget(this.scene.pacman, this.getBlinky()) 
            : ghost.getScatterTarget();
        this.updateGhostPath(ghost, target);
    }

    handleModeChange(newMode) {
        if (newMode === "scared") {
            this.setGhostsToScaredMode();
        } else {
            this.setGhostsToNormalMode();
            
            // Update paths for all ghosts based on new mode
             this.ghosts.forEach(ghost => {
                let target = newMode === "chase" 
                    ? ghost.getChaseTarget(this.scene.pacman, this.getBlinky()) 
                    : ghost.getScatterTarget();
                this.updateGhostPath(ghost, target);
            });  
        }
    }

    update() {
        this.ghosts.forEach(ghost => {
            if (ghost.enteredMaze) {
                ghost.update();
            }
        });
    }

    // Helper methods
    getBlinky() {
        return this.redGhost;
    }

    getPinky() {
        return this.pinkGhost;
    }

    getInky() {
        return this.blueGhost;
    }

    getClyde() {
        return this.orangeGhost;
    }

    // Method to handle when a ghost is eaten
    onGhostEaten(ghost) {
        ghost.sprite.setActive(false);
        ghost.sprite.setVisible(false);
        ghost.stopBlinking();
        
        this.scene.time.delayedCall(3000, () => {
            this.respawnGhost(ghost);
        });
    }

    // Clean up method
    destroy() {
        this.ghosts.forEach(ghost => {
            ghost.destroy();
        });
        this.ghosts = [];
    }
}