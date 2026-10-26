// Game data, run state, and saved progress. Positions are canvas pixels; speeds
// are per frame (designed for 60 Hz). Rules are in rules.js, drawing in draw.js,
// and the menus, controls, and frame loop in main.js.
const canvas = document.getElementById('game');
const W = canvas.width;
const H = canvas.height;
const keys = new Set();

const PLAYER_Y = H - 50;
const PLAYER_W = 56;
const PLAYER_H = 44;
const PLAYER_SPEED = 5;
const PLAYER_BULLET_SPEED = 10;
const FIRE_COOLDOWN_FRAMES = 14;
const FIRE_COOLDOWN_RAPID = 10; // Rapid Fire ability: 14 / 10 = 40% faster
const FIRE_COOLDOWN_OVERDRIVE = 6; // Rapid Overdrive ability: 14 / 6 is about 2.3x faster
const MAX_PLAYER_BULLETS = 16; // Bullets in flight at once; high fire rates need more than 4
const RESPAWN_FRAMES = 90;
const ASTEROID_SIZE = 40;
const POWER_UP_SIZE = 36;
const POWER_UP_SPAWN_FRAMES = 600; // one power-up every 10 seconds
const HEART_SIZE = 30;
const HEART_SPAWN_FRAMES = 900; // one heart pickup every 15 seconds
const MAX_LIVES = 3;
const BOSS_W = 120;
const BOSS_H = 80;
const BOSS_SCORE = 100;
const BOSS_SCORE_STEP = 100;
const BOSS_KILL_SCORE = 50;
const SPIKE_W = 32;
const SPIKE_H = 32;
const EXPLOSION_FRAMES = 9;
const EXPLOSION_FRAME_SIZE = 128;
const EXPLOSION_TICKS_PER_FRAME = 6;
const UPGRADE_MAX_LEVEL = 5;
const UPGRADE_COST_STEP = 200;
const SAVE_KEY = 'spaceRain.save';

// Each ship has one ability. The index matches the cruiser number minus one.
const SHIPS = [
    { name: 'Vanguard', price: 0, ability: 'Fires two bullets at once' },
    { name: 'Bulwark', price: 500, ability: 'Starts each run with 5 seconds of shield' },
    { name: 'Swiftwing', price: 500, ability: 'Moves 40% faster' },
    { name: 'Lodestar', price: 500, ability: 'Pulls power-ups toward you' },
    { name: 'Medic', price: 500, ability: 'Extra life every 300 points (max 3)' },
    { name: 'Piercer', price: 500, ability: 'Bullets pass through rocks' },
    { name: 'Bomber', price: 500, ability: 'Press Q: blast clears nearby rocks (20 s)' },
    { name: 'Engineer', price: 500, ability: 'Power-ups last 50% longer' },
    { name: 'Ace', price: 500, ability: 'Every point is worth 25% more' }
];
const SHIP_INDEX = { VANGUARD: 0, BULWARK: 1, SWIFT: 2, LODESTAR: 3, MEDIC: 4, PIERCER: 5, BOMBER: 6, ENGINEER: 7, ACE: 8 };

// Power-up types, in the order of the power_up_1 to power_up_6 images.
const POWER_UPS = [
    { name: 'Shield', seconds: 5 },
    { name: 'Magnet', seconds: 6 },
    { name: 'Speed', seconds: 5 },
    { name: 'Double Points', seconds: 8 },
    { name: 'Slow Rocks', seconds: 6 },
    { name: 'Nuke', seconds: 0 }
];
const POWER_UP_INFO = [
    'Blocks rock hits',
    'Pulls power-ups toward you',
    'Faster ship',
    'Double points',
    'Rocks fall slower',
    'Destroys every rock and hurts the boss'
];

// Abilities bought once in the ability shop and kept across runs.
const CRUISER_MAX_LEVEL = 3;
const CRUISER_UPGRADE_BASE = 100; // cost to go from level 1 to level 2
const CRUISER_UPGRADE_STEP = 50; // each later level costs this much more
const CRUISER_SPEED_PER_LEVEL = 0.1; // +10% ship speed per level above 1
const CRUISER_FIRE_FRAMES_PER_LEVEL = 1; // one frame faster per level above 1
const CRUISER_FIRE_FLOOR = 3; // fastest the cooldown can get, in frames
const ABILITY_PRICE = 1000;
// Indexes are saved in the save file, so existing entries keep their numbers.
const ABILITY_INDEX = { RAPID: 0, TWIN: 1, IRON: 2, SALVAGE: 3, OVERDRIVE: 4, TRIPLE: 5, SURGE: 6 };
const ABILITIES = [
    { name: 'Rapid Fire', info: 'Fire rate up 40%', requires: null },
    { name: 'Twin Shot', info: 'Fires two bullets at once', requires: null },
    { name: 'Iron Shield', info: 'Starts each run with 5 seconds of shield', requires: null },
    { name: 'Salvage', info: '+1 point for every rock destroyed', requires: null },
    { name: 'Rapid Overdrive', info: 'Fires 2.3x faster', requires: ABILITY_INDEX.RAPID },
    { name: 'Triple Shot', info: 'Fires three bullets at once', requires: ABILITY_INDEX.TWIN },
    { name: 'Power Surge', info: 'Power-ups last 50% longer', requires: null }
];

// 'loading' | 'error' | 'title' | 'playing' | 'paused' | 'over' | 'shop' | 'upgrades' | 'abilities'
let state = 'loading';
let errorMessage = '';
// Title menu buttons, in order. The key handler and the drawing both use this list.
const TITLE_MENU = ['PLAY', 'SHOP', 'UPGRADES', 'ABILITIES'];
let menuIndex = 0;
let shopIndex = 0;
let upgradeIndex = 0;
let abilityIndex = 0;
let ownedAbilities = [];
let shipLevels = SHIPS.map(() => 1); // cruiser level for each ship, 1 to CRUISER_MAX_LEVEL
let best = 0;
let wallet = 0;
let ownedShips = [0];
let selectedShip = 0;
let upgrades = [0, 0, 0, 0, 0, 0]; // level for each power-up type
let runStats = { points: 0, rocksDestroyed: 0, bossKills: 0, bossWaves: 0 };

let score = 0;
let lives = 3;
let player = { x: W / 2 };
let fireCooldown = 0;
let fireLocked = false;
let respawnTimer = 0;
let playerBullets = [];
let rocks = [];
let bossSpikes = [];
let powerUpDrops = [];
let heartDrops = [];
let heartTimer = HEART_SPAWN_FRAMES;
let heartFlash = 0; // frames left to show the "+1 HEART" message
let activePowerUps = {}; // type index -> frames left
let powerUpTimer = POWER_UP_SPAWN_FRAMES;
let rockTimer = 0;
let rockSpawnFrames = 60;
let rockSpeed = 2;
let boss = null;
let bossNext = BOSS_SCORE;
let bombCooldown = 0;
let bossBeaten = 0;
let explosions = [];
let shieldCount = 0;
let frameCount = 0;
let medicMark = 0;

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function pointIn(px, py, x, y, w, h) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
}

function playSound(name, volume = 0.5) {
    const clip = ASSETS.sounds[name].cloneNode();
    clip.volume = volume;
    clip.play().catch(() => {});
}

function explode(x, y) {
    explosions.push({ x, y, age: 0 });
    playSound('explosion', 0.4);
}

function hasAbility(index) {
    return ownedAbilities.includes(index);
}

function shipData() {
    return SHIPS[selectedShip];
}

function upgradeCost(level) {
    return (level + 1) * UPGRADE_COST_STEP;
}

function powerUpDuration(index) {
    const base = POWER_UPS[index].seconds * 60;
    const bonus = shipData() && selectedShip === SHIP_INDEX.ENGINEER ? 1.5 : 1;
    const surge = hasAbility(ABILITY_INDEX.SURGE) ? 1.5 : 1;
    return Math.round(base * bonus * surge * (1 + upgrades[index] * 0.2));
}

function addPoints(points) {
    const ace = selectedShip === SHIP_INDEX.ACE ? 1.25 : 1;
    const doubled = activePowerUps[3] > 0 ? 2 : 1;
    const gained = Math.round(points * ace * doubled);
    score += gained;
    runStats.points += gained;
    wallet += gained;
    if (score > best) best = score;
}

function loadProgress() {
    try {
        const data = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
        best = Math.max(0, Number(data.best) || 0);
        wallet = Math.max(0, Number(data.wallet) || 0);
        if (Array.isArray(data.ownedShips)) {
            ownedShips = data.ownedShips.filter(i => Number.isInteger(i) && i >= 0 && i < SHIPS.length);
        }
        if (!ownedShips.includes(0)) ownedShips.unshift(0);
        selectedShip = ownedShips.includes(data.selectedShip) ? data.selectedShip : 0;
        if (Array.isArray(data.shipLevels) && data.shipLevels.length === SHIPS.length) {
            shipLevels = data.shipLevels.map(v => Math.min(CRUISER_MAX_LEVEL, Math.max(1, Number(v) || 1)));
        }
        if (Array.isArray(data.ownedAbilities)) {
            ownedAbilities = data.ownedAbilities.filter(i => Number.isInteger(i) && i >= 0 && i < ABILITIES.length);
        }
        if (Array.isArray(data.upgrades) && data.upgrades.length === POWER_UPS.length) {
            upgrades = data.upgrades.map(v => Math.min(UPGRADE_MAX_LEVEL, Math.max(0, Number(v) || 0)));
        }
    } catch (err) {
        // Missing or unreadable save: keep the defaults
    }
}

function saveProgress() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            best, wallet, ownedShips, selectedShip, upgrades, ownedAbilities, shipLevels
        }));
    } catch (err) {
        // Storage can be blocked (for example, in private browsing)
    }
}

function resetRun() {
    fireLocked = keys.has('Space');
    score = 0;
    lives = 3;
    player.x = W / 2;
    fireCooldown = 0;
    respawnTimer = 0;
    playerBullets = [];
    rocks = [];
    bossSpikes = [];
    powerUpDrops = [];
    heartDrops = [];
    heartTimer = HEART_SPAWN_FRAMES;
    heartFlash = 0;
    activePowerUps = {};
    powerUpTimer = POWER_UP_SPAWN_FRAMES;
    rockTimer = 0;
    rockSpawnFrames = 60;
    rockSpeed = 2;
    boss = null;
    bossNext = BOSS_SCORE;
    bombCooldown = 0;
    bossBeaten = 0;
    explosions = [];
    shieldCount = 0;
    frameCount = 0;
    medicMark = 0;
    runStats = { points: 0, rocksDestroyed: 0, bossKills: 0, bossWaves: 0 };
    if (selectedShip === SHIP_INDEX.BULWARK || hasAbility(ABILITY_INDEX.IRON)) activePowerUps[0] = 300;
    state = 'playing';
    const music = ASSETS.sounds.music;
    music.loop = true;
    music.volume = 0.3;
    music.currentTime = 0;
    music.play().catch(() => {});
}

function endGame() {
    state = 'over';
    ASSETS.sounds.music.pause();
    saveProgress();
}

