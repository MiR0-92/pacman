export const GAME_CONSTANTS = {
  BLOCK_SIZE: 16,
  PACMAN_SPEED: 170,
  GHOST_SPEED: 170 * 0.7,
  SCARED_GHOST_SPEED: 170 * 0.5,
  
  SCATTER_MODE_DURATION: 5000,
  CHASE_MODE_DURATION: 20000,
  SCARED_MODE_DURATION: 9000,
  ENTRY_DELAY: 5000,
  RESPAWN_DELAY: 5000,
  
  // Fruit spawn thresholds (dots collected)
  FRUIT_SPAWN_THRESHOLDS: [70, 170],
  FRUIT_DISPLAY_TIME: 10000, // 10 seconds
  
  SCATTER_TARGETS: {
    PINKY: { x: 432, y: 80 },
    BLINKY: { x: 32, y: 80 },
    INKY: { x: 432, y: 528 },
    CLYDE: { x: 32, y: 528 }
  },
  
  DIRECTIONS: {
    LEFT: 'left',
    RIGHT: 'right',
    UP: 'up',
    DOWN: 'down'
  },
  
  // Fruit data - points based on filename
  FRUITS: [
    { texture: "Cherry", points: 100 },
    { texture: "Strawberry", points: 300 },
    { texture: "Orange", points: 500 },
    { texture: "Apple", points: 700 },
    { texture: "Banana", points: 1000 },
    { texture: "Mango", points: 2000 },
    { texture: "Grape", points: 3000 },
    { texture: "Coconut", points: 5000 }
  ],
  
  // Safe spawn position for fruits (center of maze, below ghost house)
  FRUIT_SPAWN_POSITION: { x: 232, y: 335 }
};