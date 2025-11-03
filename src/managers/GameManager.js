import { GAME_CONSTANTS } from "../utils/Constants.js";

export class GameManager {
  constructor(scene) {
    this.scene = scene;
    this.lives = 3;
    this.score = 0;
    this.currentMode = "scatter";
    this.previousMode = "scatter";
    this.modeTimer = null;
    this.isPacmanAlive = true;
    this.hasRespawned = false;
    this.dotsCollected = 0;
    this.totalDots = 0; // Will be set when dots are created
    this.fruitsSpawned = []; // Track which thresholds we've spawned fruits for
    this.currentFruit = null;
    this.lifeCounter1 = null;
    this.lifeCounter2 = null;

    this.initModeTimers();
  }

  initModeTimers() {
    this.setModeTimer(GAME_CONSTANTS.SCATTER_MODE_DURATION);
  }

  setModeTimer(duration) {
    if (this.modeTimer) {
      clearTimeout(this.modeTimer);
    }
    this.modeTimer = setTimeout(() => {
      this.switchMode();
    }, duration);
  }

  switchMode() {
    if (this.currentMode === "scared") {
      this.currentMode = this.previousMode || "scatter";
      this.setModeTimer(
        this.currentMode === "chase"
          ? GAME_CONSTANTS.CHASE_MODE_DURATION
          : GAME_CONSTANTS.SCATTER_MODE_DURATION
      );

      // Update ghost speed and state
      this.scene.ghostManager.setGhostsToNormalMode();
    } else {
      if (this.currentMode === "scatter") {
        this.currentMode = "chase";
        this.setModeTimer(GAME_CONSTANTS.CHASE_MODE_DURATION);
      } else {
        this.currentMode = "scatter";
        this.setModeTimer(GAME_CONSTANTS.SCATTER_MODE_DURATION);
      }

      // FIX: Simply update ghost paths without calling handleModeChange
      // Ghosts are already in normal mode, just need new targets
      this.scene.ghostManager.ghosts.forEach((ghost) => {
        let target =
          this.currentMode === "chase"
            ? ghost.getChaseTarget(
                this.scene.pacman,
                this.scene.ghostManager.getBlinky()
              )
            : ghost.getScatterTarget();
        this.scene.ghostManager.updateGhostPath(ghost, target);
      });

      this.previousMode = this.currentMode;
    }
  }

  setScaredMode() {
    this.previousMode = this.currentMode;
    this.currentMode = "scared";
    this.setModeTimer(GAME_CONSTANTS.SCARED_MODE_DURATION);
    this.scene.ghostManager.setGhostsToScaredMode();
    this.scene.AIManager.resetGhostChain();
  }

  handlePacmanDeath() {
    if (!this.isPacmanAlive) return;

    this.scene.pacman.die();
    this.isPacmanAlive = false;

    this.scene.time.delayedCall(2000, () => {
      this.resetAfterDeath();
    });
  }

  resetAfterDeath() {
    this.lives -= 1;
    this.updateLifeDisplay();

    if (this.lives > 0) {
      // Reset pacman position and animation
      this.scene.pacman.respawn(230, 432);

      // Reset ghosts
      this.scene.ghostManager.resetGhosts();

      // Clear any active fruit
      this.scene.fruits.clear(true, true);
      this.currentFruit = null;

      // Reset mode to scatter
      this.currentMode = "scatter";
      this.previousMode = "scatter";
      this.setModeTimer(GAME_CONSTANTS.SCATTER_MODE_DURATION);
    } else {
      // Game over
      this.gameOver();
    }

    this.isPacmanAlive = true;
    this.hasRespawned = true;
  }

  updateLifeDisplay() {
    if (this.lives === 2) {
      if (this.lifeCounter1) this.lifeCounter1.destroy();
    } else if (this.lives === 1) {
      if (this.lifeCounter2) this.lifeCounter2.destroy();
    }
  }

  createLifeCounters() {
    this.lifeCounter1 = this.scene.add.image(32, 32, "lifeCounter1");
    this.lifeCounter2 = this.scene.add.image(56, 32, "lifeCounter2");
    this.lifeCounter1.setDepth(3);
    this.lifeCounter2.setDepth(3);
  }

  gameOver() {
    this.scene.pacman.destroy();
    this.scene.ghostManager.destroy();
    this.scene.physics.pause();

    this.scene.add
      .image(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY + 56,
        "endGameImage"
      )
      .setOrigin(0.5);
  }
  checkFruitSpawning() {
    // Check if we should spawn a fruit at current dot count
    if (
      GAME_CONSTANTS.FRUIT_SPAWN_THRESHOLDS.includes(this.dotsCollected) &&
      !this.fruitsSpawned.includes(this.dotsCollected)
    ) {
      this.fruitsSpawned.push(this.dotsCollected);
      this.spawnRandomFruit();
    }
  }

  spawnRandomFruit() {
    // Get random fruit from available fruits
    const randomFruit = Phaser.Utils.Array.GetRandom(GAME_CONSTANTS.FRUITS);
    this.currentFruit = this.scene.spawnFruit(randomFruit);
  }

  eatFruit(fruit) {
    if (fruit && fruit.active) {
      this.score += fruit.points;
      console.log(
        `Ate ${fruit.texture.key} for ${fruit.points} points! Total: ${this.score}`
      );
      fruit.destroy();
      this.currentFruit = null;
    }
  }
  eatDot(dot) {
    dot.disableBody(true, true);
    this.score += 10;
    this.dotsCollected++;

    // Check for fruit spawning after eating dot
    this.checkFruitSpawning();

    // Check if all dots are collected (level complete)
    if (this.dotsCollected >= this.totalDots) {
      this.levelComplete();
    }
  }

  eatPowerPill(powerPill) {
    powerPill.disableBody(true, true);
    this.score += 50;
    this.setScaredMode();
    
  }

  levelComplete() {
    // Handle level completion
    console.log("Level Complete! Score: " + this.score);
    // You can add level progression logic here
  }

  handlePacmanGhostCollision(ghost) {
    if (this.currentMode === "scared" && !ghost.hasBeenEaten) {
      // Ghost is eaten
      this.scene.AIManager.onGhostEaten();
      this.scene.ghostManager.onGhostEaten(ghost);
      this.score += 200; // Points for eating ghost
    } else if (ghost.hasBeenEaten) {
      // Pacman is eaten
      this.handlePacmanDeath();
    }
  }

  addScore(points) {
    this.score += points;
  }

  getScore() {
    return this.score;
  }

  getLives() {
    return this.lives;
  }

  getCurrentMode() {
    return this.currentMode;
  }

  isGameOver() {
    return this.lives <= 0;
  }

  resetGame() {
    this.lives = 3;
    this.score = 0;
    this.dotsCollected = 0;
    this.currentMode = "scatter";
    this.previousMode = "scatter";
    this.isPacmanAlive = true;
    this.hasRespawned = false;
    this.fruitsSpawned = [];
    this.currentFruit = null;

    // Clear fruits from scene
    this.scene.fruits.clear(true, true)

    this.initModeTimers();
    this.createLifeCounters();
  }

  // Clean up method
  destroy() {
    if (this.modeTimer) {
      clearTimeout(this.modeTimer);
      this.modeTimer = null;
    }
  }
}
