import { GAME_CONSTANTS} from '../utils/Constants.js';

export class Pacman {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, "pacman");
        this.direction = null;
        this.previousDirection = GAME_CONSTANTS.DIRECTIONS.LEFT;
        this.speed = GAME_CONSTANTS.PACMAN_SPEED;
        this.isAlive = true;
        this.nextIntersection = null;
        this.sprite.setDepth(2);
        
        this.createAnimations();
        this.sprite.play("pacmanAnim");
    }
        createAnimations() {
        this.scene.anims.create({
            key: "pacmanAnim",
            frames: [
                { key: "pacman" }, { key: "pacman1" }, { key: "pacman2" },
                { key: "pacman3" }, { key: "pacman4" }
            ],
            frameRate: 10,
            repeat: -1,
        });

        this.scene.anims.create({
            key: "pacmanDeath",
            frames: [
                { key: "pacmanDeath1" }, { key: "pacmanDeath2" }, { key: "pacmanDeath3" }
            ],
            frameRate: 10,
            repeat: 0
        });
    }

    handleMovement() {
        let nextIntersectionx = null;
        let nextIntersectiony = null;
        if (this.nextIntersection) {
            nextIntersectionx = this.nextIntersection.x;
            nextIntersectiony = this.nextIntersection.y;
        }

        const canTurn =
            this.nextIntersection &&
            ((this.direction === "left" && this.sprite.x > nextIntersectionx) ||
                (this.direction === "right" && this.sprite.x < nextIntersectionx) ||
                (this.direction === "up" && this.sprite.y > nextIntersectiony) ||
                (this.direction === "down" && this.sprite.y < nextIntersectiony));

        if (canTurn || this.scene.pathfindingManager.isPathOpenAroundPoint(this.sprite.x, this.sprite.y)) {
            switch (this.direction) {
                case "left":
                    this.handleMovementInDirection(
                        "left",
                        "right",
                        this.sprite.y,
                        nextIntersectiony,
                        this.sprite.x,
                        true,
                        false,
                        0,
                        -this.speed,
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
                        true,
                        false,
                        180,
                        this.speed,
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
                        false,
                        true,
                        -90,
                        0,
                        -this.speed,
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
                        false,
                        true,
                        90,
                        0,
                        this.speed,
                        this.sprite.body.velocity.x
                    );
                    break;
                default:
                    this.sprite.setVelocityX(0);
                    this.sprite.setVelocityY(0);
            }
        }
    }

        handleMovementInDirection(
        currentDirection,
        oppositeDirection,
        pacmanPosition,
        intersectionPosition,
        movingCoordinate,
        flipX,
        flipY,
        angle,
        setVelocityX,
        setVelocityY,
        currentVelocity
    ) {
        let perpendicularDirection =
            currentDirection === "left" || currentDirection === "right"
                ? ["up", "down"]
                : ["left", "right"];
        let condition = false;
        if (this.nextIntersection)
            condition =
                (this.previousDirection == perpendicularDirection[0] &&
                    pacmanPosition <= intersectionPosition) ||
                (this.previousDirection == perpendicularDirection[1] &&
                    pacmanPosition >= intersectionPosition) ||
                this.previousDirection === oppositeDirection;
        if (condition) {
            let newPosition = intersectionPosition;
            if (
                this.previousDirection != oppositeDirection &&
                newPosition !== pacmanPosition
            ) {
                if (currentDirection === "left" || currentDirection === "right")
                    this.sprite.body.reset(movingCoordinate, newPosition);
                else this.sprite.body.reset(newPosition, movingCoordinate);
            }
            this.changeDirection(flipX, flipY, angle, setVelocityX, setVelocityY);
            this.adjustPosition(setVelocityX, setVelocityY);
        } else if (currentVelocity === 0) {
            this.changeDirection(flipX, flipY, angle, setVelocityX, setVelocityY);
            this.adjustPosition(setVelocityX, setVelocityY);
        }
    }

        adjustPosition(setVelocityX, setVelocityY) {
        if (this.sprite.x % GAME_CONSTANTS.BLOCK_SIZE !== 0 && setVelocityY > 0) {
            let nearestMultiple =
                Math.round(this.sprite.x / GAME_CONSTANTS.BLOCK_SIZE) * GAME_CONSTANTS.BLOCK_SIZE;
            this.sprite.body.reset(nearestMultiple, this.sprite.y);
        }
        if (this.sprite.y % GAME_CONSTANTS.BLOCK_SIZE !== 0 && setVelocityX > 0) {
            let nearestMultiple =
                Math.round(this.sprite.y / GAME_CONSTANTS.BLOCK_SIZE) * GAME_CONSTANTS.BLOCK_SIZE;
            this.sprite.body.reset(this.sprite.x, nearestMultiple);
        }
    }

        changeDirection(flipX, flipY, angle, velocityX, velocityY) {
        this.sprite.setFlipX(flipX);
        this.sprite.setFlipY(flipY);
        this.sprite.setAngle(angle);
        this.sprite.setVelocityX(velocityX);
        this.sprite.setVelocityY(velocityY);
    }

        teleportAcrossWorldBounds() {
        const worldBounds = this.scene.physics.world.bounds;
        if (this.sprite.x <= worldBounds.x) {
            this.sprite.body.reset(worldBounds.right - GAME_CONSTANTS.BLOCK_SIZE, this.sprite.y);
            this.nextIntersection = this.getNextIntersectionInNextDirection(
                this.sprite.x,
                this.sprite.y,
                "left",
                this.direction
            );
            this.sprite.setVelocityY(-1 * this.speed);
        }
        if (this.sprite.x >= worldBounds.right) {
            this.sprite.body.reset(worldBounds.x + GAME_CONSTANTS.BLOCK_SIZE, this.sprite.y);
            this.nextIntersection = this.getNextIntersectionInNextDirection(
                this.sprite.x,
                this.sprite.y,
                "right",
                this.direction
            );
            this.sprite.setVelocityX(this.speed);
        }
    }

        getNextIntersectionInNextDirection(currentX, currentY, currentDirection, nextDirection) {
        let filteredIntersections;
        const isUp = currentDirection === "up";
        const isDown = currentDirection === "down";
        const isLeft = currentDirection === "left";
        const isRight = currentDirection === "right";
        filteredIntersections = this.scene.pathfindingManager.intersections
            .filter((intersection) => {
                return (
                    ((isUp && intersection.x === currentX && intersection.y < currentY) ||
                        (isDown &&
                            intersection.x === currentX &&
                            intersection.y > currentY) ||
                        (isLeft &&
                            intersection.y === currentY &&
                            intersection.x < currentX) ||
                        (isRight &&
                            intersection.y === currentY &&
                            intersection.x > currentX)) &&
                    this.isIntersectionInDirection(intersection, nextDirection)
                );
            })
            .sort((a, b) => {
                if (isUp || isDown) {
                    return isUp ? b.y - a.y : a.y - b.y;
                } else {
                    return isLeft ? b.x - a.x : a.x - b.x;
                }
            });

        return filteredIntersections ? filteredIntersections[0] : null;
    }

        isIntersectionInDirection(intersection, direction) {
        switch (direction) {
            case "up":
                return intersection.openPaths.includes("up");
            case "down":
                return intersection.openPaths.includes("down");
            case "left":
                return intersection.openPaths.includes("left");
            case "right":
                return intersection.openPaths.includes("right");
            default:
                return false;
        }
    }

        setDirection(direction) {
        if (this.direction !== direction) {
            this.previousDirection = this.direction;
            this.direction = direction;
            this.nextIntersection = this.getNextIntersectionInNextDirection(
                this.sprite.x,
                this.sprite.y,
                this.previousDirection,
                direction
            );
        }
    }

        die() {
        if (!this.isAlive) return;

        this.sprite.setVelocityY(0);
        this.sprite.setVelocityX(0);
        this.isAlive = false;
        this.sprite.anims.stop();

        this.sprite.play("pacmanDeath");
    }

        respawn(x, y) {
        this.sprite.setPosition(x, y);
        this.isAlive = true;
        this.sprite.play("pacmanAnim");
    }

        update() {
        if (!this.isAlive) return;
        this.handleMovement();
        this.teleportAcrossWorldBounds();
    }

        // Getters for other classes to access Pacman's position
    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }

    destroy() {
        this.sprite.destroy();
    }
}