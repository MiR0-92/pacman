export class CollisionManager {
  constructor(scene) {
    this.scene = scene;
  }

  setupCollisions(layer) {
    // Pacman collision with walls
    this.scene.physics.add.collider(this.scene.pacman.sprite, layer);

    // Ghost collisions with walls
    this.scene.ghostManager.ghosts.forEach((ghost) => {
      this.scene.physics.add.collider(ghost.sprite, layer);
    });

    // Pacman overlaps with collectibles and ghosts
    this.scene.physics.add.overlap(
      this.scene.pacman.sprite,
      this.scene.dots,
      this.eatDot,
      null,
      this
    );

    this.scene.physics.add.overlap(
      this.scene.pacman.sprite,
      this.scene.powerPills,
      this.eatPowerPill,
      null,
      this
    );

    this.scene.ghostManager.ghosts.forEach((ghost) => {
      this.scene.physics.add.overlap(
        this.scene.pacman.sprite,
        ghost.sprite,
        this.handlePacmanGhostCollision,
        null,
        this
      );
    });
    // Pacman overlap with fruits
    this.scene.physics.add.overlap(
      this.scene.pacman.sprite,
      this.scene.fruits,
      this.eatFruit,
      null,
      this
    );
  }
  eatFruit(pacmanSprite, fruit) {
    // Notify game manager
    this.scene.gameManager.eatFruit(fruit);
}

  eatDot(pacmanSprite, dot) {
    // Remove the dot
    dot.disableBody(true, true);

    // Notify game manager
    this.scene.gameManager.eatDot(dot);
  }

  eatPowerPill(pacmanSprite, powerPill) {
    // Remove the power pill
    powerPill.disableBody(true, true);

    // Notify game manager
    this.scene.gameManager.eatPowerPill(powerPill);
  }

  handlePacmanGhostCollision(pacmanSprite, ghostSprite) {
    // Find the ghost object from the sprite
    const ghost = this.scene.ghostManager.ghosts.find(
      (g) => g.sprite === ghostSprite
    );

    if (!ghost) return;

    // Notify game manager to handle the collision logic
    this.scene.gameManager.handlePacmanGhostCollision(ghost);
  }

  // Method to add collision for new objects (if needed later)
  addCollider(object1, object2, callback) {
    this.scene.physics.add.collider(object1, object2, callback, null, this);
  }

  // Method to add overlap for new objects (if needed later)
  addOverlap(object1, object2, callback) {
    this.scene.physics.add.overlap(object1, object2, callback, null, this);
  }

  // Method to remove all collisions (for game reset)
  clearAllCollisions() {
    this.scene.physics.world.colliders.destroy();
    this.scene.physics.world.overlapColliders.destroy();
  }

  // Debug method to visualize collision bodies
  debugDrawCollisions() {
    if (this.scene.physics.world.debugGraphic) {
      this.scene.physics.world.debugGraphic.clear();
    }

    this.scene.physics.world.createDebugGraphic();
    this.scene.physics.world.drawDebug = true;
  }

  // Clean up method
  destroy() {
    this.clearAllCollisions();
  }
}
