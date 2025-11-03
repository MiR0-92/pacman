import { Pacman } from "../entities/Pacman.js";
import { GhostManager } from "../entities/GhostManager.js";
import { GameManager } from "../managers/GameManager.js";
import { InputManager } from "../managers/InputManager.js";
import { CollisionManager } from "../managers/CollisionManager.js";
import { PathfindingManager } from "../managers/PathfindingManager.js";
import { GAME_CONSTANTS } from "../utils/Constants.js";
import { AIManager } from "../managers/AIManager.js";
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // Load all assets
    this.load.image("pacman tileset", "/assets/pac man tiles/tileset.png");
    this.load.tilemapTiledJSON(
      "map",
      "/assets/pac man tiles/pacman tiles.json"
    );

    this.load.spritesheet(
      "pacman",
      "/assets/pac man chars/pac man/pacman.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "pacman1",
      "/assets/pac man chars/pac man/pacman1.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "pacman2",
      "/assets/pac man chars/pac man/pacman2.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "pacman3",
      "/assets/pac man chars/pac man/pacman3.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "pacman4",
      "/assets/pac man chars/pac man/pacman4.png",
      { frameWidth: 32, frameHeight: 32 }
    );

    this.load.image("dot", "/assets/pac man pill/dot.png");
    this.load.image("powerPill", "/assets/pac man pill/spr_power_pill_0.png");

    this.load.image("Cherry", "/assets/pac man fruits/Cherry_100p.png");
    this.load.image("Strawberry", "/assets/pac man fruits/Strawberry_300p.png");
    this.load.image("Orange", "/assets/pac man fruits/Orange_500p.png");
    this.load.image("Apple", "/assets/ pac man fruits/Apple_700p.png");
    this.load.image("Banana", "/assets/pac man fruits/Banana_1000p.png");
    this.load.image("Mango", "/assets/pac man fruits/Mango_2000p.png");
    this.load.image("Grape", "/assets/pac man fruits/Grape_3000p.png");
    this.load.image("Coconut", "/assets/pac man fruits/Coconut_5000p.png");

    this.load.spritesheet(
      "pinkGhost",
      "/assets/ghost/pink ghost/spr_ghost_pink_0.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "orangeGhost",
      "/assets/ghost/orange ghost/spr_ghost_orange_0.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "blueGhost",
      "/assets/ghost/blue ghost/spr_ghost_blue_0.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "redGhost",
      "/assets/ghost/red ghost/spr_ghost_red_0.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "scaredGhost",
      "/assets/ghost/gost afraid/spr_afraid_0.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "scaredGhostWhite",
      "/assets/ghost/gost afraid/spr_afraid_1.png",
      { frameWidth: 32, frameHeight: 32 }
    );

    this.load.spritesheet(
      "pacmanDeath1",
      "/assets/pac man chars/pac man death/spr_pacdeath_0.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "pacmanDeath2",
      "/assets/pac man chars/pac man death/spr_pacdeath_1.png",
      { frameWidth: 32, frameHeight: 32 }
    );
    this.load.spritesheet(
      "pacmanDeath3",
      "/assets/pac man chars/pac man death/spr_pacdeath_2.png",
      { frameWidth: 32, frameHeight: 32 }
    );

    this.load.image("endGameImage", "/assets/pac man text/spr_message_2.png");
    this.load.image(
      "lifeCounter1",
      "/assets/pac man chars/pac man life counter/spr_lifecounter_0.png"
    );
    this.load.image(
      "lifeCounter2",
      "/assets/pac man chars/pac man life counter/spr_lifecounter_0.png"
    );
  }

  create() {
    // Initialize game state
    this.board = [];

    // Create the game map
    this.createMap();

    // Initialize all managers and entities
    this.pathfindingManager = new PathfindingManager(this);
    this.pacman = new Pacman(this, 230, 432);
    this.ghostManager = new GhostManager(this);
    this.gameManager = new GameManager(this);
    this.inputManager = new InputManager(this, this.pacman);
    this.collisionManager = new CollisionManager(this);
    this.AIManager = new AIManager(this);

    // Add fruit group
    this.fruits = this.physics.add.group();
    this.fruits.setDepth(2);

    // Set up game elements
    this.setupDotsAndPills();
    this.pathfindingManager.detectIntersections();

    // Note: GhostManager.initializeGhosts() is called in its constructor
    // but we need to pass the layer for collisions
    this.collisionManager.setupCollisions(this.layer);

    // Set up life counters
    this.gameManager.createLifeCounters();

    // Count total dots for level completion
    this.gameManager.totalDots = this.dots.countActive(true);

  }

  createMap() {
    this.map = this.make.tilemap({ key: "map" });
    const tileset = this.map.addTilesetImage("pacman tileset");
    this.layer = this.map.createLayer("Tile Layer 1", [tileset]);
    this.layer.setCollisionByExclusion(-1, true);
    this.layer.setDepth(0);
  }

  setupDotsAndPills() {
    this.dots = this.physics.add.group();
    this.powerPills = this.physics.add.group();
    this.dots.setDepth(1);
    this.powerPills.setDepth(1);

    this.populateBoardAndTrackEmptyTiles();
  }

  populateBoardAndTrackEmptyTiles() {
    this.layer.forEachTile((tile) => {
      if (!this.board[tile.y]) {
        this.board[tile.y] = [];
      }
      this.board[tile.y][tile.x] = tile.index;

      if (
        tile.y < 4 ||
        (tile.y > 11 && tile.y < 23 && tile.x > 6 && tile.x < 21) ||
        (tile.y === 17 && tile.x !== 6 && tile.x !== 21)
      )
        return;

      let rightTile = this.map.getTileAt(
        tile.x + 1,
        tile.y,
        true,
        "Tile Layer 1"
      );
      let bottomTile = this.map.getTileAt(
        tile.x,
        tile.y + 1,
        true,
        "Tile Layer 1"
      );
      let rightBottomTile = this.map.getTileAt(
        tile.x + 1,
        tile.y + 1,
        true,
        "Tile Layer 1"
      );

      if (
        tile.index === -1 &&
        rightTile &&
        rightTile.index === -1 &&
        bottomTile &&
        bottomTile.index === -1 &&
        rightBottomTile &&
        rightBottomTile.index === -1
      ) {
        const x = tile.x * tile.width;
        const y = tile.y * tile.height;
        this.dots.create(x + tile.width, y + tile.height, "dot");
      }
    });

    // Create power pills at fixed positions
    this.powerPills.create(32, 144, "powerPill");
    this.powerPills.create(432, 144, "powerPill");
    this.powerPills.create(32, 480, "powerPill");
    this.powerPills.create(432, 480, "powerPill");
  }

spawnFruit(fruitData) {
    // Remove any existing fruit first
    this.fruits.clear(true, true);
    
    const fruit = this.fruits.create(
        GAME_CONSTANTS.FRUIT_SPAWN_POSITION.x,
        GAME_CONSTANTS.FRUIT_SPAWN_POSITION.y,
        fruitData.texture
    );
    
    if (fruit) {
        fruit.points = fruitData.points;
        fruit.setDepth(3); // Ensure fruit is above everything
        fruit.setScale(1); // Ensure proper scale
        fruit.setOrigin(0.5, 0.5); // Center the sprite
        
        console.log(`Spawning ${fruitData.texture} at (${fruit.x}, ${fruit.y})`);
        
        // Remove fruit after display time
        this.time.delayedCall(GAME_CONSTANTS.FRUIT_DISPLAY_TIME, () => {
            if (fruit.active) {
                fruit.destroy();
                console.log(`Fruit ${fruitData.texture} expired`);
            }
        });
    }
    
    return fruit;
}

  update() {
    if (!this.gameManager.isPacmanAlive || this.gameManager.isGameOver())
      return;

    this.AIManager.update();
    this.pacman.update();
    this.ghostManager.update();
  }

  // Getters for managers to access scene properties
  getMap() {
    return this.map;
  }

  getBoard() {
    return this.board;
  }

  getDots() {
    return this.dots;
  }

  getPowerPills() {
    return this.powerPills;
  }

  // Clean up method
  shutdown() {
    // Clean up all managers
    if (this.gameManager) this.gameManager.destroy();
    if (this.ghostManager) this.ghostManager.destroy();
    if (this.inputManager) this.inputManager.destroy();
    if (this.pathfindingManager) this.pathfindingManager.destroy();
    if (this.collisionManager) this.collisionManager.destroy();
    if (this.aiManager) this.aiManager.destroy();
    // Clean up entities
    if (this.pacman) this.pacman.destroy();

    // Clean up groups
    if (this.dots) this.dots.destroy();
    if (this.powerPills) this.powerPills.destroy();
  }
}
