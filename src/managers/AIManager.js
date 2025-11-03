import { GAME_CONSTANTS } from "../utils/Constants.js";

export class AIManager {
  constructor(scene) {
    this.scene = scene;
    this.pacman = scene.pacman;
    this.gameManager = scene.gameManager;
    this.pathfinder = scene.pathfindingManager;
    this.ghostManager = scene.ghostManager;

    this.lastIntersection = null;
    this.AT_INTERSECTION_THRESHOLD = this.pacman.speed / 60;
    
    // AI TUNING: AI is more cautious
    this.EVASION_RANGE = GAME_CONSTANTS.BLOCK_SIZE * 15;
    
    this.currentTarget = null;
    this.currentTargetType = null; // 'dot', 'fruit', or 'ghost'

    // Ghost chain tracking
    this.ghostChainCount = 0;
    this.lastGhostEatenTime = 0;
    this.chainTimeout = 3000; // 3 seconds to maintain chain

    this.HEURISTIC_SCORES = {
      // Existing scores
      MOVE_TOWARDS_THREAT: -2000,
      MOVE_AWAY_FROM_THREAT: 800,
      PATH_INTERSECTS_GHOST: -10000,
      ENERGIZER_ESCAPE: 15000,
      COLLECT_DOT: 20,
      WASTE_ENERGIZER: -Infinity,

      // New advanced scores
      TUNNEL_USAGE: 25,
      FRUIT_BONUS: 200,
      LURE_GHOST_TO_PILL: 150,
      EAT_POWER_PILL: 150,
      EAT_POWER_PILL_GHOSTS_NEARBY: 500,
      EAT_FIRST_GHOST: 200,
      EAT_SECOND_GHOST: 400,
      EAT_THIRD_GHOST: 800,
      EAT_FOURTH_GHOST: 1600,
      
      // AI TUNING: Cautiousness multiplier
      DISTANCE_SAFETY_MULTIPLIER: 8, 
    };
  }

  update() {
    if (!this.pacman.isAlive) return;
    this.updateGhostStates(); 

    if (this.currentTarget && !this.currentTarget.active) {
      console.log(
        `[AI Target] Target ${this.currentTargetType} was collected. Finding new one.`
      );
      this.currentTarget = null;
      this.currentTargetType = null;
    }

    const nearestIntersection = this.pathfinder.findNearestIntersection(
      this.pacman.sprite
    );
    if (!nearestIntersection) return;

    const distance = this.getDistance(this.pacman.sprite, nearestIntersection);
    const atIntersection = distance < this.AT_INTERSECTION_THRESHOLD;
    const isStopped =
      this.pacman.sprite.body.velocity.x === 0 &&
      this.pacman.sprite.body.velocity.y === 0;

    let decisionPoint = null;

    if (atIntersection && nearestIntersection !== this.lastIntersection) {
      this.lastIntersection = nearestIntersection;
      decisionPoint = this.lastIntersection;
    } else if (isStopped && !atIntersection) {
      const openPaths = this.findOpenPathsAt(this.pacman.x, this.pacman.y);
      decisionPoint = {
        x: this.pacman.x,
        y: this.pacman.y,
        openPaths: openPaths,
      };
    } else if (isStopped && atIntersection) {
      decisionPoint = nearestIntersection;
    }

    if (decisionPoint) {
      console.group(
        `%c AI Decision @ (${Math.round(decisionPoint.x)}, ${Math.round(
          decisionPoint.y
        )})`,
        "color: #4CAF50; font-weight: bold;"
      );
      const chosenDirection = this.decideNextMove(decisionPoint);
      console.log(
        `%c  -> FINAL DECISION: ${chosenDirection}`,
        "background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;"
      );
      console.groupEnd();

      this.pacman.setDirection(chosenDirection);
    }
  }

decideNextMove(intersection) {
    const currentMode = this.gameManager.currentMode;
    const { possibleDirections } = this.getPossibleDirections(intersection);

    console.log("Possible Directions:", possibleDirections);

    // Check for immediate threats first
    const immediateThreats = this.findNearbyThreats(GAME_CONSTANTS.BLOCK_SIZE * 8); // 8 block range for immediate danger
    const generalThreats = this.findNearbyThreats(this.EVASION_RANGE);
    
    console.log(`Threat Assessment: ${immediateThreats.length} immediate, ${generalThreats.length} general`);

    // URGENT: If ghosts are very close, prioritize evasion above all else
    if (immediateThreats.length > 0) {
        console.log("%c!!! IMMEDIATE THREAT - FORCING EVASION !!!", "background: #FF0000; color: white; padding: 2px 5px; border-radius: 3px;");
        return this.runEvasionLogic(possibleDirections, immediateThreats, intersection);
    }

    if (currentMode === "scared") {
        console.log("%cSelected Mode: GHOST HUNTING", "color: #03A9F4;");
        return this.runGhostHuntingLogic(possibleDirections, intersection);
    }

    // --- AGGRESSIVE POWER PILL OVERRIDE ---
    const activePowerPills = this.scene.powerPills.getChildren().filter(p => p.active);
    
    if (generalThreats.length >= 2 && activePowerPills.length > 0) {
        console.log(
            `%c!!! STRATEGIC OVERRIDE: ${generalThreats.length} ghosts nearby. HUNTING POWER PILL !!!`,
            "background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;"
        );
        
        const closestPill = this.findClosestObject(activePowerPills);
        if (closestPill) {
            this.currentTarget = closestPill;
            this.currentTargetType = "powerPill";
            return this.runDotHuntingLogic(possibleDirections, intersection);
        }
    }

    // Normal evasion for single ghost
    if (generalThreats.length > 0) {
        console.log("%cSelected Mode: EVASION", "color: #F44336;");
        return this.runEvasionLogic(possibleDirections, generalThreats, intersection);
    }

    console.log("%cSelected Mode: DOT HUNTING", "color: #FFC107;");
    return this.runDotHuntingLogic(possibleDirections, intersection);
}
updateGhostStates() {
    this.ghostManager.ghosts.forEach(ghost => {
        // Update ghost scared state based on game mode
        ghost.isScared = this.gameManager.currentMode === "scared";
        
        // Update ghost activity status
        if (ghost.sprite) {
            ghost.isActive = ghost.sprite.active && ghost.enteredMaze && !ghost.hasBeenEaten;
        }
    });
}

runGhostHuntingLogic(possibleDirections, intersection) {
  // This logic is correct
  const fruit = this.findActiveFruit();
  const scaredGhosts = this.ghostManager.ghosts
    .filter(g => !g.hasBeenEaten && this.gameManager.currentMode === "scared")
    .map(g => g.sprite);

  const closestGhost = this.findClosestObject(scaredGhosts);
  let target = null; 

  let ghostScore = 0;
  if (closestGhost) {
    const ghostDist = this.getDistance(this.pacman.sprite, closestGhost);
    const ghostPoints = this.getGhostChainBonus(); 
    ghostScore = ghostPoints / (ghostDist + 1);
  }

  let fruitScore = 0;
  if (fruit && fruit.points) {
    const fruitDist = this.getDistance(this.pacman.sprite, fruit);
    fruitScore = fruit.points / (fruitDist + 1);
  }

  if (fruitScore > 0 && fruitScore > ghostScore) {
    target = fruit;
    this.currentTargetType = "fruit";
  } else if (closestGhost) {
    target = closestGhost; 
    this.currentTargetType = "ghost";
  } else if (fruit) {
    target = fruit;
    this.currentTargetType = "fruit";
  }

  if (!target) {
    console.log("[Ghost Hunting] No scared ghosts or fruit. Switching to Dot Hunting.");
    this.currentTarget = null;
    this.currentTargetType = null;
    return this.runDotHuntingLogic(possibleDirections, intersection);
  }

  if (this.currentTargetType === "ghost") {
    const ghost = this.ghostManager.ghosts.find(g => g.sprite === target);
    if (ghost) {
      target = this.predictGhostPosition(ghost, 3);
    }
  }

  this.currentTarget = (this.currentTargetType === "ghost") ? closestGhost : (this.currentTargetType === "fruit" ? fruit : null);

  console.log(`[Ghost Hunting] Target: ${this.currentTargetType} @ (${target.x}, ${target.y})`);

  return this.getDirectionFromAStar(
    target,
    possibleDirections,
    intersection
  );
}

predictGhostPosition(ghost, stepsAhead) {
  const stepSize = this.ghostManager.ghostSpeed * 0.016; 
  let predictedX = ghost.sprite.x;
  let predictedY = ghost.sprite.y;
  
  for (let i = 0; i < stepsAhead; i++) {
    switch (ghost.direction) {
      case "left": predictedX -= stepSize; break;
      case "right": predictedX += stepSize; break;
      case "up": predictedY -= stepSize; break;
      case "down": predictedY += stepSize; break;
    }
  }
  
  return { x: predictedX, y: predictedY };
}

runEvasionLogic(possibleDirections, threats, intersection) {
    let scores = {};
    const scoreBreakdown = [];
    const powerPills = this.scene.powerPills.getChildren().filter(p => p.active);

    console.log("%c[Evasion] Calculating advanced scores...", "color: #F44336; font-weight: bold;");
    console.log(`[Evasion] ${threats.length} threats detected, ${powerPills.length} power pills available`);

    for (const dir of possibleDirections) {
        scores[dir] = 0;
        let breakdown = {
            direction: dir,
            threatScore: 0,
            distanceSafety: 0,
            intersectPenalty: 0,
            pillBonus: 0,
            lureBonus: 0,
            FinalScore: 0,
        };

        const nextIntersection = this.pathfinder.getNextIntersection(
            intersection.x,
            intersection.y,
            dir
        );

        if (!nextIntersection) {
            scores[dir] = -Infinity;
            breakdown.FinalScore = -Infinity;
            scoreBreakdown.push(breakdown);
            continue;
        }

        let totalGhostDistance = 0;
        let closestGhostDistance = Infinity;

        // Calculate threat scores
        for (const threat of threats) {
            const futureDist = this.getDistance(nextIntersection, threat.sprite);
            totalGhostDistance += futureDist;
            closestGhostDistance = Math.min(closestGhostDistance, futureDist);
            
            // Severe penalty for moving toward ghosts
            if (futureDist < closestGhostDistance - GAME_CONSTANTS.BLOCK_SIZE) {
                scores[dir] += this.HEURISTIC_SCORES.MOVE_TOWARDS_THREAT;
                breakdown.threatScore += this.HEURISTIC_SCORES.MOVE_TOWARDS_THREAT;
            } else {
                scores[dir] += this.HEURISTIC_SCORES.MOVE_AWAY_FROM_THREAT;
                breakdown.threatScore += this.HEURISTIC_SCORES.MOVE_AWAY_FROM_THREAT;
            }
        }

        // Distance safety bonus - prioritize directions that increase distance from ghosts
        const distanceSafetyBonus = totalGhostDistance * this.HEURISTIC_SCORES.DISTANCE_SAFETY_MULTIPLIER;
        scores[dir] += distanceSafetyBonus;
        breakdown.distanceSafety += distanceSafetyBonus;

        // Power pill logic - only seek pills when 2+ ghosts are nearby
        if (threats.length >= 2 && powerPills.length > 0) {
            const closestPill = this.findClosestObject(powerPills);
            if (closestPill) {
                const distToPill = this.getDistance(nextIntersection, closestPill);
                let pillBonus = this.HEURISTISTIC_SCORES.ENERGIZER_ESCAPE / (distToPill + 1);
                
                // Extra bonus if we can lure ghosts to the pill
                if (distToPill < this.EVASION_RANGE * 0.7) {
                    pillBonus += this.HEURISTIC_SCORES.LURE_GHOST_TO_PILL;
                    breakdown.lureBonus += this.HEURISTIC_SCORES.LURE_GHOST_TO_PILL;
                }
                
                scores[dir] += pillBonus;
                breakdown.pillBonus += pillBonus;
            }
        }

        breakdown.FinalScore = scores[dir];
        scoreBreakdown.push(breakdown);
    }

    console.table(scoreBreakdown);
    return this.getBestDirectionFromScores(scores, possibleDirections);
}

isTunnelDirection(direction, intersection) {
  const openPaths = intersection.openPaths;
  return openPaths.length === 2 && 
         this.getOppositeDirection(direction) === openPaths.find(dir => dir !== direction);
}

onGhostEaten() {
  const now = this.scene.time.now;
  
  if (now - this.lastGhostEatenTime > this.chainTimeout) {
    this.ghostChainCount = 0;
  }
  
  this.ghostChainCount++;
  this.lastGhostEatenTime = now;
  
  console.log(`[Ghost Chain] Count: ${this.ghostChainCount}`);
}

getGhostChainBonus() {
  switch (this.ghostChainCount) {
    case 1: return this.HEURISTIC_SCORES.EAT_FIRST_GHOST;
    case 2: return this.HEURISTIC_SCORES.EAT_SECOND_GHOST;
    case 3: return this.HEURISTIC_SCORES.EAT_THIRD_GHOST;
    case 4: return this.HEURISTIC_SCORES.EAT_FOURTH_GHOST;
    default: return this.HEURISTIC_SCORES.EAT_FIRST_GHOST;
  }
}

resetGhostChain() {
  this.ghostChainCount = 0;
}

  runDotHuntingLogic(possibleDirections, intersection) {
    let target = this.currentTarget;

    if (
      !target ||
      (this.currentTargetType !== "dot" && this.currentTargetType !== "fruit" && this.currentTargetType !== "powerPill")
    ) {
      // --- FIX #3: "FORWARD MOMENTUM" LOGIC ---
      // We are no longer just finding the *closest* object.
      // We are finding the *highest scoring* object.
      
      const fruit = this.findActiveFruit();
      const allDots = this.scene.dots.getChildren().filter((d) => d.active);

      let bestDot = null;
      let bestDotScore = -Infinity;
      
      const pacX = this.pacman.sprite.x;
      const pacY = this.pacman.sprite.y;
      const pacDir = this.pacman.direction;

      // Score all dots
      for (const dot of allDots) {
        const dotDist = this.getDistance(this.pacman.sprite, dot);
        let dotScore = 1000 / (dotDist + 1); // 10 points is too low, use 1000 as a base

        // Apply "forward momentum" penalty (from pacman-somewhat-ai.js)
        let isBehind = false;
        if (pacDir === 'left' && dot.x > pacX) isBehind = true;
        if (pacDir === 'right' && dot.x < pacX) isBehind = true;
        if (pacDir === 'up' && dot.y > pacY) isBehind = true;
        if (pacDir === 'down' && dot.y < pacY) isBehind = true;

        if (isBehind) {
            dotScore *= 0.5; // 50% penalty for turning around
        }
        
        if (dotScore > bestDotScore) {
            bestDotScore = dotScore;
            bestDot = dot;
        }
      }

      // Score the fruit
      let bestFruit = null;
      let bestFruitScore = -Infinity;
      if (fruit && fruit.points) { 
        const fruitDist = this.getDistance(this.pacman.sprite, fruit);
        // Fruit score is (points * 10) / distance. We multiply by 10 to balance against the 1000-base for dots.
        bestFruitScore = (fruit.points * 10) / (fruitDist + 1);
        bestFruit = fruit;
      }

      // Now, pick the best target
      if (bestFruitScore > bestDotScore && bestFruit) {
        target = bestFruit;
        this.currentTargetType = "fruit";
      } else if (bestDot) {
        target = bestDot;
        this.currentTargetType = "dot";
      } else if (bestFruit) {
        // No dots left, but fruit exists
        target = bestFruit;
        this.currentTargetType = "fruit";
      } else {
        target = null; // No dots or fruit
      }
      // --- END OF FIX #3 ---
      
      this.currentTarget = target;
    }

    if (!target) {
      // Emergency: No dots or fruit, let's check for pills just in case
      const powerPills = this.scene.powerPills.getChildren().filter(p => p.active);
      if (powerPills.length > 0) {
        this.currentTarget = this.findClosestObject(powerPills);
        this.currentTargetType = "powerPill";
        target = this.currentTarget;
      } else {
         console.log("[Dot Hunting] No dots, fruit, or pills left. Moving randomly.");
        return possibleDirections[
          Math.floor(Math.random() * possibleDirections.length)
        ];
      }
    }

    console.log(
      `[Dot Hunting] Pursuing ${this.currentTargetType} @ (${target.x}, ${target.y})`
    );

    let chosenDirection = this.getDirectionFromAStar(
      target,
      possibleDirections,
      intersection
    );

   /*  if (
      this.currentTargetType !== "powerPill" && // Don't save a pill if it's our *forced target*
      this.isPathToWastedEnergizer(chosenDirection, intersection) &&
      possibleDirections.length > 1
    ) {
      console.warn(
        `[Energizer Saving] AVOIDING path ${chosenDirection} to save energizer.`
      );

      this.currentTarget = null;
      this.currentTargetType = null;

      let alternative = possibleDirections.find(
        (dir) => dir !== chosenDirection
      );
      if (alternative) {
        return alternative;
      }
    }
 */
    return chosenDirection;
  }

  // --- Helper Functions ---

findNearbyThreats(range) {
    const threats = [];
    if (this.gameManager.currentMode === "scared") {
        return threats;
    }
    
    for (const ghost of this.ghostManager.ghosts) {
        // Only consider ghosts that are actual threats
        if (ghost.hasBeenEaten || !ghost.enteredMaze || ghost.isScared) continue;
        
        const dist = this.getDistance(this.pacman.sprite, ghost.sprite);
        if (dist < range) {
            // Add threat level based on distance - closer ghosts are more dangerous
            ghost.threatLevel = (range - dist) / range;
            threats.push(ghost);
        }
    }
    
    // Sort by proximity - closest ghosts first
    threats.sort((a, b) => {
        const distA = this.getDistance(this.pacman.sprite, a.sprite);
        const distB = this.getDistance(this.pacman.sprite, b.sprite);
        return distA - distB;
    });
    
    return threats;
}

  isPathToWastedEnergizer(direction, intersection) {
    const nextIntersection = this.pathfinder.getNextIntersection(
      intersection.x,
      intersection.y,
      direction
    );
    if (!nextIntersection) return false;
    const isPill = this.scene.powerPills
      .getChildren()
      .filter((p) => p.active)
      .some(
        (pill) => pill.x === nextIntersection.x && pill.y === nextIntersection.y
      );
    // "Wasted" means we're safe (no threats)
    return isPill && this.findNearbyThreats(this.EVASION_RANGE).length === 0;
  }

  findActiveFruit() {
    return this.scene.fruits.getChildren()[0] || null;
  }

  getDirectionFromAStar(target, possibleDirections, intersection) {
    const path = this.pathfinder.aStarAlgorithm(this.pacman.sprite, target);

    if (!path || path.length < 2) {
      console.warn(
        "[A* Path] A* returned no valid path. Picking random direction."
      );
      return possibleDirections[
        Math.floor(Math.random() * possibleDirections.length)
      ];
    }

    const nextIntersection = path[1];
    const direction = this.getDirectionToTarget(intersection, nextIntersection);

    console.log(
      "[A* Path] Path found:",
      path.map((p) => `(${p.x}, ${p.y})`)
    );
    console.log(
      `[A* Path] Next node: (${nextIntersection.x}, ${nextIntersection.y}). Needs direction: ${direction}`
    );

    // --- FIX #2: "ALWAYS TRUST A*" LOOP FIX ---
    // If A* found a path, we MUST take it, even if it means reversing.
    // This breaks all loops caused by the "no-reverse" rule.
    if (!possibleDirections.includes(direction)) {
      console.warn(
        `[A* Path] A* direction '${direction}' is not in 'possible' list. Trusting A* (reversing).`,
        possibleDirections
      );
    }
    
    // Always return the A* path's direction if a path was found.
    return direction;
  }

  getBestDirectionFromScores(scores, possibleDirections) {
    let bestScore = -Infinity;
    let bestDirection = possibleDirections[0];
    for (const [direction, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }
    return bestDirection;
  }

  getPossibleDirections(intersection) {
    // This is the simple "no-reverse" rule.
    // It is "dumber," but we NEED it to be dumb.
    // The "smart" part is now in getDirectionFromAStar, which can override this.
    const allDirections = intersection.openPaths;
    const oppositeDir = this.getOppositeDirection(this.pacman.direction);

    let possibleDirections = allDirections.filter((dir) => dir !== oppositeDir);

    if (possibleDirections.length === 0 && allDirections.length > 0) {
      // This is a dead end, we must be allowed to reverse.
      possibleDirections = allDirections;
    }

    return { possibleDirections, allDirections, oppositeDir };
  }

  findOpenPathsAt(x, y) {
    const directions = [
      { x: -GAME_CONSTANTS.BLOCK_SIZE, y: 0, name: "left" },
      { x: GAME_CONSTANTS.BLOCK_SIZE, y: 0, name: "right" },
      { x: 0, y: -GAME_CONSTANTS.BLOCK_SIZE, name: "up" },
      { x: 0, y: GAME_CONSTANTS.BLOCK_SIZE, name: "down" },
    ];
    let openPaths = [];
    directions.forEach((dir) => {
      if (this.pathfinder.isPathOpenAroundPoint(x + dir.x, y + dir.y)) {
        openPaths.push(dir.name);
      }
    });
    return openPaths;
  }

  getOppositeDirection(direction) {
    switch (direction) {
      case GAME_CONSTANTS.DIRECTIONS.LEFT:
        return GAME_CONSTANTS.DIRECTIONS.RIGHT;
      case GAME_CONSTANTS.DIRECTIONS.RIGHT:
        return GAME_CONSTANTS.DIRECTIONS.LEFT;
      case GAME_CONSTANTS.DIRECTIONS.UP:
        return GAME_CONSTANTS.DIRECTIONS.DOWN;
      case GAME_CONSTANTS.DIRECTIONS.DOWN:
        return GAME_CONSTANTS.DIRECTIONS.UP;
      default:
        return "none";
    }
  }

  getDistance(objA, objB) {
    return Phaser.Math.Distance.Between(objA.x, objA.y, objB.x, objB.y);
  }

  findClosestObject(objectGroup) {
    let closest = null;
    let minDistance = Infinity;
    for (const obj of objectGroup) {
      if (!obj.active) continue;
      const distance = this.getDistance(this.pacman.sprite, obj);
      if (distance < minDistance) {
        minDistance = distance;
        closest = obj;
      }
    }
    return closest;
  }

  getDirectionToTarget(source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0
        ? GAME_CONSTANTS.DIRECTIONS.RIGHT
        : GAME_CONSTANTS.DIRECTIONS.LEFT;
    } else {
      return dy > 0
        ? GAME_CONSTANTS.DIRECTIONS.DOWN
        : GAME_CONSTANTS.DIRECTIONS.UP;
    }
  }

  destroy() {
    this.scene = null;
    this.pacman = null;
    this.gameManager = null;
    this.pathfinder = null;
    this.ghostManager = null;
  }
}