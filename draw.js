// Rendering only. All game state lives in game.js and rules.js; input and the
// frame loop are in main.js.
const ctx = canvas.getContext('2d');
const MONO = '"Courier New", monospace';
const COLOR = {
    primary: '#7ff7ff',
    accent: '#ff7ab6',
    gold: '#ffd166',
    danger: '#ff4d6d',
    panel: 'rgba(4, 8, 24, 0.78)'
};

// Parallax starfield: three layers that scroll at different speeds
const STARS = [];
for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 40 + layer * 25; i++) {
        STARS.push({
            x: Math.random() * W,
            y: Math.random() * H,
            layer,
            size: 0.6 + layer * 0.6,
            twinkle: Math.random() * Math.PI * 2
        });
    }
}

function drawCentered(img, cx, cy, w, h) {
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

// Ship art is drawn upside down so the nose points up toward the rocks.
function drawFlipped(img, cx, cy, w, h) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, -1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
}

function drawSpaceBackground() {
    // Deep space gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#02030c');
    grad.addColorStop(1, '#0b0630');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Nebula cover image, dimmed so it doesn't fight the play field
    const img = ASSETS.images.background;
    const scale = Math.max(W / img.width, H / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    ctx.globalAlpha = 1;
}

function drawStars() {
    const t = performance.now() / 1000;
    for (const s of STARS) {
        const speed = 0.3 + s.layer * 0.45;
        s.y += speed;
        if (s.y > H) {
            s.y = 0;
            s.x = Math.random() * W;
        }
        const alpha = 0.5 + 0.5 * Math.sin(t * 2 + s.twinkle);
        ctx.fillStyle = `rgba(200, 240, 255, ${(0.4 + 0.2 * s.layer) * alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }
}

function drawPlanet() {
    // Slow ringed planet in the upper-right corner
    const t = performance.now() / 1000;
    const size = 170 + Math.sin(t * 0.2) * 4;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(ASSETS.images.planet, W - size * 0.8, -size * 0.2, size, size);
    ctx.globalAlpha = 1;
}

function drawSceneBackground() {
    drawSpaceBackground();
    drawPlanet();
    drawStars();
}

function drawRocks() {
    for (const rock of rocks) {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.spin);
        ctx.drawImage(ASSETS.images.asteroid, -ASTEROID_SIZE / 2, -ASTEROID_SIZE / 2, ASTEROID_SIZE, ASTEROID_SIZE);
        ctx.restore();
    }
}

function drawPowerUpDrops() {
    for (const d of powerUpDrops) {
        // Soft glow behind each pickup so it stands out against the stars
        const glow = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, POWER_UP_SIZE);
        glow.addColorStop(0, 'rgba(127, 247, 255, 0.45)');
        glow.addColorStop(1, 'rgba(127, 247, 255, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(d.x - POWER_UP_SIZE, d.y - POWER_UP_SIZE, POWER_UP_SIZE * 2, POWER_UP_SIZE * 2);
        drawCentered(ASSETS.powerUps[d.type], d.x, d.y, POWER_UP_SIZE, POWER_UP_SIZE);
    }
}

function drawBoss() {
    if (!boss) return;
    // Glow behind the boss
    const glow = ctx.createRadialGradient(boss.x, boss.y, 10, boss.x, boss.y, BOSS_W * 0.7);
    glow.addColorStop(0, 'rgba(255, 77, 109, 0.35)');
    glow.addColorStop(1, 'rgba(255, 77, 109, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(boss.x - BOSS_W, boss.y - BOSS_W, BOSS_W * 2, BOSS_W * 2);
    drawFlipped(ASSETS.ships[6], boss.x, boss.y, BOSS_W, BOSS_H);
    const frac = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = 'rgba(40, 0, 10, 0.8)';
    ctx.fillRect(boss.x - BOSS_W / 2, boss.y - BOSS_H / 2 - 12, BOSS_W, 6);
    ctx.fillStyle = COLOR.danger;
    ctx.fillRect(boss.x - BOSS_W / 2, boss.y - BOSS_H / 2 - 12, BOSS_W * frac, 6);
}

function drawBossSpikes() {
    const frame = Math.floor(frameCount / 6) % 7;
    const img = ASSETS.images.spike;
    for (const s of bossSpikes) {
        ctx.drawImage(img, frame * 32, 0, 32, 32, s.x - SPIKE_W / 2, s.y - SPIKE_H / 2, SPIKE_W, SPIKE_H);
    }
}

function drawEngineFlame(cx, cy) {
    // Flickering flame below the ship, which is drawn upside down
    const flicker = 0.7 + Math.random() * 0.5;
    const len = 14 * flicker;
    const grad = ctx.createLinearGradient(0, cy + PLAYER_H / 2, 0, cy + PLAYER_H / 2 + len);
    grad.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
    grad.addColorStop(0.5, 'rgba(255, 122, 182, 0.7)');
    grad.addColorStop(1, 'rgba(255, 122, 182, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + PLAYER_H / 2 - 2);
    ctx.lineTo(cx + 6, cy + PLAYER_H / 2 - 2);
    ctx.lineTo(cx, cy + PLAYER_H / 2 + len);
    ctx.closePath();
    ctx.fill();
}

function drawPlayer() {
    // Blink while respawning
    if (respawnTimer > 0 && Math.floor(respawnTimer / 6) % 2 === 0) return;
    drawEngineFlame(player.x, PLAYER_Y);
    drawFlipped(ASSETS.ships[selectedShip], player.x, PLAYER_Y, PLAYER_W, PLAYER_H);
    if (activePowerUps[0] > 0) {
        ctx.strokeStyle = 'rgba(127, 247, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, PLAYER_Y, PLAYER_W * 0.7, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawBullets() {
    for (const b of playerBullets) drawCentered(ASSETS.images.playerBullet, b.x, b.y, 8, 22);
}

function drawExplosions() {
    const img = ASSETS.images.explosion;
    const size = 56;
    for (const x of explosions) {
        const frame = Math.min(EXPLOSION_FRAMES - 1, Math.floor(x.age / EXPLOSION_TICKS_PER_FRAME));
        ctx.drawImage(img, frame * EXPLOSION_FRAME_SIZE, 0, EXPLOSION_FRAME_SIZE, EXPLOSION_FRAME_SIZE,
            x.x - size / 2, x.y - size / 2, size, size);
    }
}


function drawHud() {
    ctx.fillStyle = COLOR.primary;
    ctx.font = `18px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${score}`, 12, 26);
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${best}`, W - 12, 26);
    ctx.textAlign = 'center';
    const bossText = `BOSS ${boss ? 'FIGHT' : 'in ' + Math.max(0, bossNext - score)}`;
    ctx.fillText(`ROCKS ${runStats.rocksDestroyed}  ${bossText}`, W / 2, 26);
    for (let i = 0; i < lives; i++) {
        ctx.drawImage(ASSETS.images.heart, 12 + i * 28, 36, 22, 22);
    }
    // Active power-up timers, one line each
    ctx.textAlign = 'left';
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = COLOR.gold;
    let y = 80;
    for (const key of Object.keys(activePowerUps)) {
        const left = Math.ceil(activePowerUps[key] / 60);
        ctx.fillText(`${POWER_UPS[key].name} ${left}s`, 12, y);
        y += 18;
    }
    if (selectedShip === SHIP_INDEX.BOMBER) {
        ctx.textAlign = 'right';
        ctx.fillText(bombCooldown > 0 ? `BOMB ${Math.ceil(bombCooldown / 60)}s` : 'BOMB READY (Q)', W - 12, 56);
    }
}

function drawPanel(x, y, w, h, active = false) {
    ctx.fillStyle = COLOR.panel;
    ctx.fillRect(x, y, w, h);
    if (active) {
        ctx.fillStyle = 'rgba(127, 247, 255, 0.2)';
        ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = COLOR.primary;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawCenterPanel(title, lines) {
    drawPanel(0, H / 2 - 90, W, 180);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR.primary;
    ctx.font = `bold 40px ${MONO}`;
    ctx.fillText(title, W / 2, H / 2 - 20);
    ctx.font = `18px ${MONO}`;
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H / 2 + 20 + i * 28));
}

function drawMenuButtons(labels, selected, top) {
    ctx.textAlign = 'center';
    ctx.font = `bold 22px ${MONO}`;
    labels.forEach((label, i) => {
        const y = top + i * 56;
        const active = i === selected;
        drawPanel(W / 2 - 180, y - 24, 360, 44, active);
        ctx.fillStyle = active ? COLOR.gold : COLOR.primary;
        ctx.fillText(active ? `> ${label} <` : label, W / 2, y + 6);
    });
}

function drawTitle() {
    ctx.textAlign = 'center';
    ctx.shadowColor = COLOR.primary;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLOR.primary;
    ctx.font = `bold 52px ${MONO}`;
    ctx.fillText('SPACE RAIN', W / 2, 150);
    ctx.shadowBlur = 0;
    ctx.font = `16px ${MONO}`;
    ctx.fillStyle = COLOR.accent;
    ctx.fillText(`Best ${best}   Wallet ${wallet}   Ship: ${SHIPS[selectedShip].name}`, W / 2, 186);
    drawMenuButtons(['PLAY', 'SHOP', 'UPGRADES'], menuIndex, 250);
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = COLOR.primary;
    ctx.fillText('UP/DOWN choose   ENTER select', W / 2, 470);
    ctx.fillText('Arrows or A/D move   SPACE fire   Q bomb (Bomber)   F full screen', W / 2, 494);
}


function drawShop() {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR.primary;
    ctx.font = `bold 32px ${MONO}`;
    ctx.fillText('SHIP SHOP', W / 2, 60);
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = COLOR.gold;
    ctx.fillText(`Wallet ${wallet}`, W / 2, 84);
    SHIPS.forEach((ship, i) => {
        const y = 120 + i * 44;
        drawPanel(40, y - 26, W - 80, 38, i === shopIndex);
        ctx.textAlign = 'left';
        ctx.drawImage(ASSETS.ships[i], 52, y - 22, 50, 30);
        ctx.fillStyle = COLOR.primary;
        ctx.font = `bold 15px ${MONO}`;
        ctx.fillText(ship.name, 116, y - 4);
        ctx.font = `12px ${MONO}`;
        ctx.fillStyle = COLOR.accent;
        ctx.fillText(ship.ability, 116, y + 10);
        ctx.textAlign = 'right';
        const status = ownedShips.includes(i)
            ? (selectedShip === i ? 'FLYING' : 'OWNED')
            : `${ship.price} pts`;
        ctx.fillStyle = COLOR.gold;
        ctx.fillText(status, W - 56, y + 4);
    });
    ctx.textAlign = 'center';
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = COLOR.primary;
    ctx.fillText('UP/DOWN choose   ENTER buy or fly   Z back', W / 2, H - 20);
}

function drawUpgrades() {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR.primary;
    ctx.font = `bold 32px ${MONO}`;
    ctx.fillText('POWER-UP UPGRADES', W / 2, 60);
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = COLOR.gold;
    ctx.fillText(`Wallet ${wallet}`, W / 2, 84);
    POWER_UPS.forEach((p, i) => {
        const y = 130 + i * 56;
        const level = upgrades[i];
        drawPanel(40, y - 28, W - 80, 46, i === upgradeIndex);
        ctx.textAlign = 'left';
        ctx.drawImage(ASSETS.powerUps[i], 52, y - 22, 34, 34);
        ctx.fillStyle = COLOR.primary;
        ctx.font = `bold 16px ${MONO}`;
        ctx.fillText(`${p.name}  Lv ${level}/${UPGRADE_MAX_LEVEL}`, 100, y - 4);
        ctx.font = `12px ${MONO}`;
        ctx.fillStyle = COLOR.accent;
        ctx.fillText(POWER_UP_INFO[i], 100, y + 12);
        ctx.textAlign = 'right';
        ctx.font = `14px ${MONO}`;
        ctx.fillStyle = COLOR.gold;
        const text = level >= UPGRADE_MAX_LEVEL ? 'MAX' : `${upgradeCost(level)} pts`;
        ctx.fillText(text, W - 56, y + 4);
    });
    ctx.textAlign = 'center';
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = COLOR.primary;
    ctx.fillText('UP/DOWN choose   ENTER upgrade   Z back', W / 2, H - 20);
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (state === 'loading') {
        drawCenterPanel('LOADING...', ['Loading sprites and sounds']);
        return;
    }
    if (state === 'error') {
        drawCenterPanel('LOAD ERROR', [errorMessage, 'Check that the file names match']);
        return;
    }
    if (state === 'title') {
        drawSceneBackground();
        drawTitle();
        return;
    }
    if (state === 'shop') {
        drawSceneBackground();
        drawShop();
        return;
    }
    if (state === 'upgrades') {
        drawSceneBackground();
        drawUpgrades();
        return;
    }

    drawSceneBackground();
    drawRocks();
    drawPowerUpDrops();
    drawBoss();
    drawBossSpikes();
    drawBullets();
    drawPlayer();
    drawExplosions();
    drawHud();

    if (state === 'paused') {
        drawCenterPanel('PAUSED', ['P to resume']);
    } else if (state === 'over') {
        drawCenterPanel('GAME OVER', [`Score: ${score}   Best: ${best}`, 'ENTER to play again   Z menu']);
    }
}

