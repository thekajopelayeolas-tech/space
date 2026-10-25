// Rock rain, the boss, power-ups, ship abilities, and collisions.
// Loaded after game.js and before draw.js and main.js.

function playerSpeed() {
    let speed = PLAYER_SPEED;
    if (selectedShip === SHIP_INDEX.SWIFT) speed *= 1.4;
    if (activePowerUps[2] > 0) speed *= 1.5;
    return speed;
}

function rockPoints() {
    return 1 + Math.floor(runStats.rocksDestroyed / 50);
}

function destroyRock(rock) {
    explode(rock.x, rock.y);
    addPoints(rockPoints());
    runStats.rocksDestroyed++;
}

function spawnRock() {
    rocks.push({
        x: randomBetween(ASTEROID_SIZE / 2, W - ASTEROID_SIZE / 2),
        y: -ASTEROID_SIZE,
        vy: randomBetween(0.8, 1.2) * rockSpeed,
        spin: Math.random() * Math.PI * 2
    });
}

function spawnPowerUp() {
    powerUpDrops.push({
        x: randomBetween(POWER_UP_SIZE, W - POWER_UP_SIZE),
        y: -POWER_UP_SIZE,
        type: Math.floor(Math.random() * POWER_UPS.length)
    });
}

function applyPowerUp(type) {
    playSound('powerUp', 0.5);
    if (type === 5) {
        nuke();
        return;
    }
    activePowerUps[type] = powerUpDuration(type);
}

function nuke() {
    for (const rock of rocks) {
        explosions.push({ x: rock.x, y: rock.y, age: 0 });
        addPoints(rockPoints());
        runStats.rocksDestroyed++;
    }
    rocks = [];
    bossSpikes = [];
    playSound('explosion', 0.6);
    if (boss) {
        boss.hp -= 5 + upgrades[5] * 2;
        if (boss.hp <= 0) defeatBoss();
    }
}

function detonateBomb() {
    if (state !== 'playing' || respawnTimer > 0 || bombCooldown > 0) return;
    if (selectedShip !== SHIP_INDEX.BOMBER) return;
    bombCooldown = 1200; // 20 seconds
    const radius = 180;
    rocks = rocks.filter(rock => {
        if (Math.hypot(rock.x - player.x, rock.y - PLAYER_Y) > radius) return true;
        destroyRock(rock);
        return false;
    });
    explosions.push({ x: player.x, y: PLAYER_Y - 40, age: 0 });
}

function hitPlayer() {
    if (activePowerUps[0] > 0) {
        delete activePowerUps[0];
        playSound('shield', 0.5);
        return;
    }
    loseLife();
}

function loseLife() {
    lives--;
    explode(player.x, PLAYER_Y);
    playSound('hit', 0.5);
    playerBullets = [];
    bossSpikes = [];
    if (lives <= 0) endGame();
    else respawnTimer = RESPAWN_FRAMES;
}

function checkMedic() {
    if (selectedShip !== SHIP_INDEX.MEDIC) return;
    while (score >= medicMark + 300) {
        medicMark += 300;
        if (lives < 5) lives++;
    }
}

function fireShot() {
    const y = PLAYER_Y - PLAYER_H / 2;
    if (selectedShip === SHIP_INDEX.VANGUARD) {
        playerBullets.push({ x: player.x - 12, y }, { x: player.x + 12, y });
    } else {
        playerBullets.push({ x: player.x, y });
    }
    fireCooldown = FIRE_COOLDOWN_FRAMES;
    playSound('laser', 0.25);
}

function updatePlayer() {
    if (respawnTimer > 0) return;
    const speed = playerSpeed();
    if (keys.has('ArrowLeft') || keys.has('KeyA')) player.x -= speed;
    if (keys.has('ArrowRight') || keys.has('KeyD')) player.x += speed;
    player.x = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, player.x));
    if (fireCooldown > 0) fireCooldown--;
    if (keys.has('Space') && !fireLocked && fireCooldown === 0 && playerBullets.length < 4) fireShot();
}

function updatePlayerBullets() {
    const piercer = selectedShip === SHIP_INDEX.PIERCER;
    playerBullets = playerBullets.filter(b => {
        b.y -= PLAYER_BULLET_SPEED;
        if (b.y < 0) return false;
        if (boss && pointIn(b.x, b.y, boss.x - BOSS_W / 2, boss.y - BOSS_H / 2, BOSS_W, BOSS_H)) {
            boss.hp--;
            if (boss.hp <= 0) defeatBoss();
            return false;
        }
        const index = rocks.findIndex(r => pointIn(b.x, b.y,
            r.x - ASTEROID_SIZE / 2, r.y - ASTEROID_SIZE / 2, ASTEROID_SIZE, ASTEROID_SIZE));
        if (index >= 0) {
            const rock = rocks[index];
            rocks.splice(index, 1);
            destroyRock(rock);
            return piercer;
        }
        return true;
    });
}

function updateRocks() {
    const slow = activePowerUps[4] > 0 ? 0.5 : 1;
    rockSpeed = 2 + Math.min(3, score / 150);
    rockSpawnFrames = Math.max(20, 60 - Math.floor(score / 40) * 3);
    rockTimer++;
    if (rockTimer >= rockSpawnFrames) {
        rockTimer = 0;
        spawnRock();
    }
    rocks = rocks.filter(rock => {
        rock.y += rock.vy * slow;
        rock.spin += 0.04;
        if (rock.y > H + ASTEROID_SIZE) return false;
        if (respawnTimer === 0 && pointIn(rock.x, rock.y,
            player.x - PLAYER_W / 2, PLAYER_Y - PLAYER_H / 2, PLAYER_W, PLAYER_H)) {
            hitPlayer();
            return false;
        }
        return true;
    });
}


function updatePowerUps() {
    powerUpTimer--;
    if (powerUpTimer <= 0) {
        powerUpTimer = POWER_UP_SPAWN_FRAMES;
        spawnPowerUp();
    }
    const magnet = activePowerUps[1] > 0 || selectedShip === SHIP_INDEX.LODESTAR;
    powerUpDrops = powerUpDrops.filter(d => {
        d.y += 1.5;
        if (magnet && respawnTimer === 0) {
            const dx = player.x - d.x;
            const dy = PLAYER_Y - d.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 1 && dist < 220) {
                d.x += dx / dist * 3;
                d.y += dy / dist * 3;
            }
        }
        if (d.y > H + POWER_UP_SIZE) return false;
        if (respawnTimer === 0 && pointIn(d.x, d.y,
            player.x - PLAYER_W / 2, PLAYER_Y - PLAYER_H / 2, PLAYER_W, PLAYER_H)) {
            applyPowerUp(d.type);
            return false;
        }
        return true;
    });
}

function tickTimers() {
    for (const key of Object.keys(activePowerUps)) {
        activePowerUps[key]--;
        if (activePowerUps[key] <= 0) delete activePowerUps[key];
    }
    if (bombCooldown > 0) bombCooldown--;
}

function spawnBoss() {
    const hp = 20 + bossBeaten * 10;
    boss = { x: W / 2, y: 90, vx: 2 + bossBeaten * 0.3, hp, maxHp: hp, fireTimer: 60 };
    bossNext += BOSS_SCORE_STEP;
}

function bossFire() {
    const dir = Math.max(-1, Math.min(1, (player.x - boss.x) / 200));
    bossSpikes.push({ x: boss.x, y: boss.y + BOSS_H / 2, vx: dir * 1.5, vy: 3 + bossBeaten * 0.3 });
    boss.fireTimer = Math.max(35, 80 - bossBeaten * 5);
}

function defeatBoss() {
    explode(boss.x, boss.y);
    addPoints(BOSS_KILL_SCORE);
    runStats.bossKills++;
    bossBeaten++;
    boss = null;
    bossSpikes = [];
}

function updateBoss() {
    if (!boss) {
        if (score >= bossNext) spawnBoss();
        return;
    }
    boss.x += boss.vx;
    if (boss.x < BOSS_W / 2 + 10 || boss.x > W - BOSS_W / 2 - 10) boss.vx *= -1;
    boss.fireTimer--;
    if (boss.fireTimer <= 0) bossFire();

    bossSpikes = bossSpikes.filter(s => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.y > H || s.x < -SPIKE_W || s.x > W + SPIKE_W) return false;
        if (respawnTimer === 0 && pointIn(s.x, s.y,
            player.x - PLAYER_W / 2, PLAYER_Y - PLAYER_H / 2, PLAYER_W, PLAYER_H)) {
            hitPlayer();
            return false;
        }
        return true;
    });
}

function updateExplosions() {
    for (const x of explosions) x.age++;
    explosions = explosions.filter(x => x.age < EXPLOSION_FRAMES * EXPLOSION_TICKS_PER_FRAME);
}

function update() {
    if (state !== 'playing') {
        updateExplosions();
        return;
    }
    frameCount++;
    if (respawnTimer > 0) respawnTimer--;
    tickTimers();
    updatePlayer();
    updatePlayerBullets();
    updateRocks();
    updatePowerUps();
    updateBoss();
    checkMedic();
    updateExplosions();
}

