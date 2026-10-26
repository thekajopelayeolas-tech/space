// Menus, controls, and the frame loop. Load order: assets.js, game.js, rules.js, draw.js, main.js.

function openTitle() {
    ASSETS.sounds.music.pause();
    state = 'title';
    menuIndex = 0;
    saveProgress();
}

function buyOrFlyShip(index) {
    if (ownedShips.includes(index)) {
        selectedShip = index;
    } else if (wallet >= SHIPS[index].price) {
        wallet -= SHIPS[index].price;
        ownedShips.push(index);
        selectedShip = index;
    } else {
        return;
    }
    saveProgress();
}

// Cost to go from the current level to the next one: 100 at level 1, 150 at level 2.
function cruiserUpgradeCost(index) {
    return CRUISER_UPGRADE_BASE + CRUISER_UPGRADE_STEP * (shipLevels[index] - 1);
}

function upgradeCruiser(index) {
    if (!ownedShips.includes(index)) return;
    if (shipLevels[index] >= CRUISER_MAX_LEVEL) return;
    const cost = cruiserUpgradeCost(index);
    if (wallet < cost) return;
    wallet -= cost;
    shipLevels[index]++;
    saveProgress();
}

function buyUpgrade(index) {
    const level = upgrades[index];
    if (level >= UPGRADE_MAX_LEVEL) return;
    const cost = upgradeCost(level);
    if (wallet < cost) return;
    wallet -= cost;
    upgrades[index]++;
    saveProgress();
}

function abilityLocked(index) {
    const required = ABILITIES[index].requires;
    return required !== null && !hasAbility(required);
}

function buyAbility(index) {
    if (hasAbility(index)) return;
    if (abilityLocked(index)) return;
    if (wallet < ABILITY_PRICE) return;
    wallet -= ABILITY_PRICE;
    ownedAbilities.push(index);
    saveProgress();
}

function handleMenuKey(code) {
    if (state === 'title') {
        const count = TITLE_MENU.length;
        if (code === 'ArrowUp' || code === 'KeyW') menuIndex = (menuIndex + count - 1) % count;
        if (code === 'ArrowDown' || code === 'KeyS') menuIndex = (menuIndex + 1) % count;
        if (code === 'Enter' || code === 'Space') {
            if (TITLE_MENU[menuIndex] === 'PLAY') resetRun();
            if (TITLE_MENU[menuIndex] === 'SHOP') state = 'shop';
            if (TITLE_MENU[menuIndex] === 'UPGRADES') state = 'upgrades';
            if (TITLE_MENU[menuIndex] === 'ABILITIES') state = 'abilities';
        }
    } else if (state === 'abilities') {
        if (code === 'ArrowUp' || code === 'KeyW') abilityIndex = (abilityIndex + ABILITIES.length - 1) % ABILITIES.length;
        if (code === 'ArrowDown' || code === 'KeyS') abilityIndex = (abilityIndex + 1) % ABILITIES.length;
        if (code === 'Enter' || code === 'Space') buyAbility(abilityIndex);
        if (code === 'KeyZ') openTitle();
    } else if (state === 'shop') {
        if (code === 'ArrowUp' || code === 'KeyW') shopIndex = (shopIndex + SHIPS.length - 1) % SHIPS.length;
        if (code === 'ArrowDown' || code === 'KeyS') shopIndex = (shopIndex + 1) % SHIPS.length;
        if (code === 'Enter' || code === 'Space') buyOrFlyShip(shopIndex);
        if (code === 'KeyU') upgradeCruiser(shopIndex);
        if (code === 'KeyZ') openTitle();
    } else if (state === 'upgrades') {
        if (code === 'ArrowUp' || code === 'KeyW') upgradeIndex = (upgradeIndex + POWER_UPS.length - 1) % POWER_UPS.length;
        if (code === 'ArrowDown' || code === 'KeyS') upgradeIndex = (upgradeIndex + 1) % POWER_UPS.length;
        if (code === 'Enter' || code === 'Space') buyUpgrade(upgradeIndex);
        if (code === 'KeyZ') openTitle();
    } else if (state === 'over') {
        if (code === 'Enter' || code === 'Space') resetRun();
        if (code === 'KeyZ') openTitle();
    }
}

function toggleFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) Promise.resolve(exit.call(document)).catch(() => {});
    } else {
        const request = el.requestFullscreen || el.webkitRequestFullscreen;
        if (request) Promise.resolve(request.call(el)).catch(() => {});
    }
}

function updateFullscreenButton() {
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    document.getElementById('fullscreen').textContent = active ? 'Exit full screen (F)' : 'Full screen (F)';
}

document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyF') {
        toggleFullscreen();
        return;
    }

    if (state === 'playing') {
        if (e.code === 'KeyP') state = 'paused';
        else if (e.code === 'KeyQ') detonateBomb();
        else if (e.code === 'KeyZ') openTitle();
    } else if (state === 'paused') {
        if (e.code === 'KeyP') state = 'playing';
        else if (e.code === 'KeyZ') openTitle();
    } else {
        handleMenuKey(e.code);
    }
});
window.addEventListener('keyup', e => {
    keys.delete(e.code);
    if (e.code === 'Space') fireLocked = false;
});
window.addEventListener('blur', () => keys.clear());

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loadProgress();
loadAssets()
    .then(() => { state = 'title'; })
    .catch(err => {
        state = 'error';
        errorMessage = err.message;
    });
loop();
