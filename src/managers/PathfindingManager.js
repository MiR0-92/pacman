import { GAME_CONSTANTS } from '../utils/Constants.js';

export class PathfindingManager {
    constructor(scene) {
        this.scene = scene;
        this.intersections = [];
    }

    detectIntersections() {
        const directions = [
            { x: -GAME_CONSTANTS.BLOCK_SIZE, y: 0, name: "left" },
            { x: GAME_CONSTANTS.BLOCK_SIZE, y: 0, name: "right" },
            { x: 0, y: -GAME_CONSTANTS.BLOCK_SIZE, name: "up" },
            { x: 0, y: GAME_CONSTANTS.BLOCK_SIZE, name: "down" },
        ];
        
        const blockSize = GAME_CONSTANTS.BLOCK_SIZE;
        
        for (let y = 0; y < this.scene.map.heightInPixels; y += blockSize) {
            for (let x = 0; x < this.scene.map.widthInPixels; x += blockSize) {
                if (x % blockSize !== 0 || y % blockSize !== 0) continue;
                if (!this.isPointClear(x, y)) continue;
                
                let openPaths = [];
                directions.forEach((dir) => {
                    if (this.isPathOpenAroundPoint(x + dir.x, y + dir.y)) {
                        openPaths.push(dir.name);
                    }
                });
                
                // Fix 1: Removed "&& y < 530" to scan the whole map.
                const isValidY = y > 64; 

                if (openPaths.length > 2 && isValidY) {
                    this.intersections.push({ x: x, y: y, openPaths: openPaths });
                } else if (openPaths.length === 2 && isValidY) {
                    const [dir1, dir2] = openPaths;
                    if (((dir1 === "left" || dir1 === "right") &&
                         (dir2 === "up" || dir2 === "down")) || 
                        ((dir1 === "up" || dir1 === "down") && 
                         (dir2 === "left" || dir2 === "right"))) {
                        this.intersections.push({ x: x, y: y, openPaths: openPaths });
                    }
                }
            }
        }
    }

    aStarAlgorithm(start, target) {
        console.log(`[A* Log] Starting A*...`);
        const isInGhostHouse = this.isInGhostHouse.bind(this);

        function findNearestIntersection(point, intersections) {
            let nearest = null;
            let minDist = Infinity;
            for (const intersection of intersections) {
                if (isInGhostHouse(intersection.x, intersection.y)) {
                    continue;
                }
                const dist = Math.abs(intersection.x - point.x) + Math.abs(intersection.y - point.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = intersection;
                }
            }
            return nearest;
        }

        const startIntersection = findNearestIntersection(start, this.intersections);
        const targetIntersection = findNearestIntersection(target, this.intersections);

        if (!startIntersection) {
            console.error(`[A* Log] ERROR: Could not find a valid start intersection near ${start.x}, ${start.y}`);
            return [];
        }
         if (!targetIntersection) {
            console.error(`[A* Log] ERROR: Could not find a valid target intersection near ${target.x}, ${target.y}`);
            return [];
        }
        
        console.log(`[A* Log] Start Node: (${startIntersection.x}, ${startIntersection.y})`);
        console.log(`[A* Log] Target Node: (${targetIntersection.x}, ${targetIntersection.y})`);

        const openList = [];
        const closedList = new Set();
        const cameFrom = new Map();
        const gScore = new Map();

        openList.push({ node: startIntersection, g: 0, f: heuristic(startIntersection, targetIntersection) });
        gScore.set(JSON.stringify(startIntersection), 0);

        function heuristic(node, target) {
            return Math.abs(node.x - target.x) + Math.abs(node.y - target.y);
        }

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f);
            const current = openList.shift().node;

            if (current.x === targetIntersection.x && current.y === targetIntersection.y) {
                const path = [];
                let currentNode = current;
                while (cameFrom.has(JSON.stringify(currentNode))) {
                    path.push(currentNode);
                    currentNode = cameFrom.get(JSON.stringify(currentNode));
                }
                path.push(startIntersection);
                const finalPath = path.reverse();
                console.log(`[A* Log] Path Found! Length: ${finalPath.length}`, finalPath.map(p => `(${p.x}, ${p.y})`));
                return finalPath;
            }

            closedList.add(JSON.stringify(current));

            const currentIntersection = this.intersections.find(i => i.x === current.x && i.y === current.y);

            if (currentIntersection) {
                for (const direction of currentIntersection.openPaths) {
                    const neighbor = this.getNextIntersection(current.x, current.y, direction);

                    if (neighbor && !isInGhostHouse(neighbor.x, neighbor.y) && !closedList.has(JSON.stringify(neighbor))) {
                        const tentativeGScore = gScore.get(JSON.stringify(current)) + 1;

                        if (!gScore.has(JSON.stringify(neighbor)) || tentativeGScore < gScore.get(JSON.stringify(neighbor))) {
                            gScore.set(JSON.stringify(neighbor), tentativeGScore);
                            const fScore = tentativeGScore + heuristic(neighbor, targetIntersection);
                            openList.push({ node: neighbor, g: tentativeGScore, f: fScore });
                            cameFrom.set(JSON.stringify(neighbor), current);
                        }
                    }
                }
            }
        }

        console.warn(`[A* Log] FAILED to find a path from (${startIntersection.x}, ${startIntersection.y}) to (${targetIntersection.x}, ${targetIntersection.y})`);
        return [];
    }

    getNextIntersection(currentX, currentY, previousDirection) {
        let filteredIntersections;
        const isUp = previousDirection === "up";
        const isDown = previousDirection === "down";
        const isLeft = previousDirection === "left";
        const isRight = previousDirection === "right";
        
        filteredIntersections = this.intersections.filter((intersection) => {
            return (
                ((isUp && intersection.x === currentX && intersection.y < currentY) ||
                 (isDown && intersection.x === currentX && intersection.y > currentY) ||
                 (isLeft && intersection.y === currentY && intersection.x < currentX) ||
                 (isRight && intersection.y === currentY && intersection.x > currentX))
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

    isPointClear(x, y) {
        const corners = [
            { x: x - 1, y: y - 1 },
            { x: x + 1, y: y - 1 },
            { x: x - 1, y: y + 1 },
            { x: x + 1, y: y + 1 },
        ];
        
        return corners.every((corner) => {
            const tileX = Math.floor(corner.x / GAME_CONSTANTS.BLOCK_SIZE);
            const tileY = Math.floor(corner.y / GAME_CONSTANTS.BLOCK_SIZE);

            return !this.scene.board[tileY] || this.scene.board[tileY][tileX] === -1;
        });
    }

    isPathOpenAroundPoint(pixelX, pixelY) {
        const corners = [
            // --- FIX 2: Corrected 'y' to 'pixelY' ---
            { x: pixelX - 1, y: pixelY - 1 },
            { x: pixelX + 1, y: pixelY - 1 },
            { x: pixelX - 1, y: pixelY + 1 },
            { x: pixelX + 1, y: pixelY + 1 },
        ];
        
        return corners.every((corner) => {
            const tileX = Math.floor(corner.x / GAME_CONSTANTS.BLOCK_SIZE);
            const tileY = Math.floor(corner.y / GAME_CONSTANTS.BLOCK_SIZE);
            
            if (!this.scene.board[tileY] || this.scene.board[tileY][tileX] !== -1) {
                return false;
            }
            return true;
        });
    }

    isInGhostHouse(x, y) {
        if ((x <= 262 && x >= 208) && (y <= 288 && y > 240)) return true;
        else return false;
    }

    // Helper method to find the nearest intersection to a point
    findNearestIntersection(point) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const intersection of this.intersections) {
            const dist = Math.abs(intersection.x - point.x) + Math.abs(intersection.y - point.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = intersection;
            }
        }
        
        return nearest;
    }

    // Debug method to visualize intersections
    debugDrawIntersections() {
        this.intersections.forEach(intersection => {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xff0000, 0.5);
            graphics.fillRect(intersection.x - 2, intersection.y - 2, 4, 4);
        });
    }

    // Clean up method
    destroy() {
        this.intersections = [];
    }
}