import { GAME_CONSTANTS} from '../utils/Constants.js';

export class Ghost {
    constructor(scene, x, y, textureKey, ghostType) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, textureKey);
        this.ghostType = ghostType;
        this.originalTexture = textureKey;
        this.direction = GAME_CONSTANTS.DIRECTIONS.RIGHT;
        this.previousDirection = GAME_CONSTANTS.DIRECTIONS.RIGHT;
        this.nextIntersection = null;
        this.enteredMaze = false;
        this.hasBeenEaten = false;
        this.path = [];
        this.stuckTimer = 0;
        this.blinkInterval = null;
        this.sprite.setDepth(2);
    }

        getChaseTarget(pacman, blinky) {
        const offset = GAME_CONSTANTS.BLOCK_SIZE * 4;
        const aheadOffset = GAME_CONSTANTS.BLOCK_SIZE * 2;

        switch (this.ghostType) {
            case "blinky": // redGhost
                return { x: pacman.x, y: pacman.y };
                
            case "pinky": // pinkGhost
                switch (pacman.direction) {
                    case "right":
                        return { x: pacman.x + offset, y: pacman.y };
                    case "left":
                        return { x: pacman.x - offset, y: pacman.y };
                    case "up":
                        return { x: pacman.x, y: pacman.y - offset };
                    case "down":
                        return { x: pacman.x, y: pacman.y + offset };
                    default:
                        return { x: pacman.x, y: pacman.y };
                }
                
            case "clyde": // orangeGhost
                const distance = Math.hypot(this.sprite.x - pacman.x, this.sprite.y - pacman.y);
                return distance > GAME_CONSTANTS.BLOCK_SIZE * 8 
                    ? { x: pacman.x, y: pacman.y } 
                    : GAME_CONSTANTS.SCATTER_TARGETS.CLYDE;
                    
            case "inky": // blueGhost
                let pacmanAhead = { x: pacman.x, y: pacman.y };
                
                switch (pacman.direction) {
                    case "right":
                        pacmanAhead = { x: pacman.x + aheadOffset, y: pacman.y };
                        break;
                    case "left":
                        pacmanAhead = { x: pacman.x - aheadOffset, y: pacman.y };
                        break;
                    case "up":
                        pacmanAhead = { x: pacman.x, y: pacman.y - aheadOffset };
                        break;
                    case "down":
                        pacmanAhead = { x: pacman.x, y: pacman.y + aheadOffset };
                        break;
                }
                
                const vectorX = pacmanAhead.x - blinky.sprite.x;
                const vectorY = pacmanAhead.y - blinky.sprite.y;

                return { 
                    x: blinky.sprite.x + 2 * vectorX, 
                    y: blinky.sprite.y + 2 * vectorY 
                };
                
            default:
                return { x: pacman.x, y: pacman.y };
        }
    }

        getScatterTarget() {
        switch (this.ghostType) {
            case "blinky":
                return GAME_CONSTANTS.SCATTER_TARGETS.BLINKY;
            case "pinky":
                return GAME_CONSTANTS.SCATTER_TARGETS.PINKY;
            case "inky":
                return GAME_CONSTANTS.SCATTER_TARGETS.INKY;
            case "clyde":
                return GAME_CONSTANTS.SCATTER_TARGETS.CLYDE;
            default:
                return GAME_CONSTANTS.SCATTER_TARGETS.BLINKY;
        }
    }

        getScaredTarget() {
        const randomIndex = Math.floor(Math.random() * this.scene.pathfindingManager.intersections.length);
        const randomIntersection = this.scene.pathfindingManager.intersections[randomIndex];
        return { x: randomIntersection.x, y: randomIntersection.y };
    }
        handleDirection() {
        if (this.scene.pathfindingManager.isInGhostHouse(this.sprite.x, this.sprite.y)) {
            this.changeDirection(0, -this.scene.ghostManager.ghostSpeed);
            if (this.direction === "down") {
                this.direction = "up";
            }
        }

        const isMoving = this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0;
        if (!isMoving) {
            this.stuckTimer = (this.stuckTimer || 0) + 1;
            if (this.stuckTimer > 30) {
                this.stuckTimer = 0;
                let newTarget = this.scene.gameManager.currentMode === "scared" 
                    ? this.getScaredTarget() 
                    : this.scene.gameManager.currentMode === "chase" 
                        ? this.getChaseTarget(this.scene.pacman, this.scene.ghostManager.getBlinky()) 
                        : this.getScatterTarget();
                this.scene.ghostManager.updateGhostPath(this, newTarget);
            }
        } else {
            this.stuckTimer = 0;
        }

        if (this.sprite.body.velocity.x === 0 && this.sprite.body.velocity.y === 0) {
            this.adjustPosition();
        }

        let isAtIntersection = this.isAtIntersection(this.nextIntersection, this.sprite.x, this.sprite.y, this.direction);

        if (isAtIntersection) {
            const scatterTarget = this.getScatterTarget();
            if (scatterTarget.x === this.nextIntersection.x && scatterTarget.y === this.nextIntersection.y && 
                this.scene.gameManager.currentMode === "scatter") {
                return;
            }

            if (this.scene.gameManager.currentMode === "chase") {
                let chaseTarget = this.getChaseTarget(this.scene.pacman, this.scene.ghostManager.getBlinky());
                this.scene.ghostManager.updateGhostPath(this, chaseTarget);
            } 

            if (this.path.length > 0) {
                this.nextIntersection = this.path.shift();
            }
            if (this.path.length === 0 && this.scene.gameManager.currentMode === "scared") {
                let scaredTarget = this.getScaredTarget();
                this.scene.ghostManager.updateGhostPath(this, scaredTarget);
            }

            let newDirection = this.getNextDirection(this.nextIntersection);
            this.previousDirection = this.direction;
            this.direction = newDirection;
        }
    }

        handleMovement() {
        let nextIntersectionx = null;
        let nextIntersectiony = null;
        if (this.nextIntersection) {
            nextIntersectionx = this.nextIntersection.x;
            nextIntersectiony = this.nextIntersection.y;
        }
        
        switch (this.direction) {
            case "left":
                this.handleMovementInDirection(
                    "left",
                    "right",
                    this.sprite.y,
                    nextIntersectiony,
                    this.sprite.x,
                    -this.scene.ghostManager.ghostSpeed,
                    0,
                    this.sprite.body.velocity.y
                );
                break;
            case "right":
                this.handleMovementInDirection(
                    "right",
                    "left",
                    this.sprite.y,
                    nextIntersectiony,
                    this.sprite.x,
                    this.scene.ghostManager.ghostSpeed,
                    0,
                    this.sprite.body.velocity.y
                );
                break;
            case "up":
                this.handleMovementInDirection(
                    "up",
                    "down",
                    this.sprite.x,
                    nextIntersectionx,
                    this.sprite.y,
                    0,
                    -this.scene.ghostManager.ghostSpeed,
                    this.sprite.body.velocity.x
                );
                break;
            case "down":
                this.handleMovementInDirection(
                    "down",
                    "up",
                    this.sprite.x,
                    nextIntersectionx,
                    this.sprite.y,
                    0,
                    this.scene.ghostManager.ghostSpeed,
                    this.sprite.body.velocity.x
                );
                break;
        }
    }

        handleMovementInDirection(
        currentDirection,
        oppositeDirection,
        ghostPosition,
        intersectionPosition,
        movingCoordinate,
        velocityX,
        velocityY,
        currentVelocity
    ) {
        let perpendicularDirection =
            currentDirection === "left" || currentDirection === "right"
                ? ["up", "down"]
                : ["left", "right"];
        let condition = false;
        if (this.nextIntersection) {
            condition =
                (this.previousDirection === perpendicularDirection[0] &&
                    ghostPosition <= intersectionPosition) ||
                (this.previousDirection === perpendicularDirection[1] &&
                    ghostPosition >= intersectionPosition) ||
                (this.previousDirection === oppositeDirection);
            if (condition) {
                let newPosition = intersectionPosition;
                if (
                    this.previousDirection !== oppositeDirection &&
                    newPosition !== ghostPosition
                ) {
                    if (currentDirection === "left" || currentDirection === "right") {
                        this.sprite.body.reset(movingCoordinate, newPosition);
                    } else {
                        this.sprite.body.reset(newPosition, movingCoordinate);
                    }
                }
                this.changeDirection(velocityX, velocityY);
            } else if (currentVelocity === 0) {
                this.changeDirection(velocityX, velocityY);
            }
        }
    }
        changeDirection(velocityX, velocityY) {
        this.sprite.setVelocityX(velocityX);
        this.sprite.setVelocityY(velocityY);
    }

        adjustPosition() {
        if (this.sprite.x % GAME_CONSTANTS.BLOCK_SIZE !== 0) {
            let nearestMultiple =
                Math.round(this.sprite.x / GAME_CONSTANTS.BLOCK_SIZE) * GAME_CONSTANTS.BLOCK_SIZE;
            this.sprite.body.reset(nearestMultiple, this.sprite.y);
        }
        if (this.sprite.y % GAME_CONSTANTS.BLOCK_SIZE !== 0) {
            let nearestMultiple =
                Math.round(this.sprite.y / GAME_CONSTANTS.BLOCK_SIZE) * GAME_CONSTANTS.BLOCK_SIZE;
            this.sprite.body.reset(this.sprite.x, nearestMultiple);
        }
    }
        isAtIntersection(intersection, currentX, currentY, direction) {
        const isUp = direction === "up";
        const isDown = direction === "down";
        const isLeft = direction === "left";
        const isRight = direction === "right";
        if (!intersection) return false;

        let condition = (
            (isUp && intersection.x === currentX && intersection.y >= currentY) ||
            (isDown && intersection.x === currentX && intersection.y <= currentY) ||
            (isLeft && intersection.y === currentY && intersection.x >= currentX) ||
            (isRight && intersection.y === currentY && intersection.x <= currentX)
        );
        return condition;
    }

        getNextDirection(intersection) {
        let dx = intersection.x - this.sprite.x;
        let dy = intersection.y - this.sprite.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? "right" : "left";
        } else {
            return dy > 0 ? "down" : "up";
        }
    }
        setScared() {
        this.sprite.setTexture("scaredGhost");
    }

    setNormal() {
        this.sprite.setTexture(this.originalTexture);
    }

    startBlinking() {
        let blinkOn = true;
        this.blinkInterval = setInterval(() => {
            if (this.hasBeenEaten) return;
            blinkOn = !blinkOn;
            this.sprite.setTexture(blinkOn ? "scaredGhost" : "scaredGhostWhite");
        }, 200);
    }

        stopBlinking() {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
    }

    enterMaze(x, y) {
        this.sprite.setPosition(x, y);
        this.enteredMaze = true;
        if (this.scene.gameManager.currentMode !== "scared") {
            this.hasBeenEaten = true;
        }
    }
        respawn(x, y) {
        this.sprite.setPosition(x, y);
        this.sprite.setActive(true);
        this.sprite.setVisible(true);
        this.setNormal();
        this.hasBeenEaten = true;
        this.enteredMaze = false;
        this.stopBlinking();
    }

    update() {
        if (!this.enteredMaze) return;
        this.handleDirection();
        this.handleMovement();
    }

    // Getters for other classes
    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }

    destroy() {
        this.stopBlinking();
        this.sprite.destroy();
    }
}