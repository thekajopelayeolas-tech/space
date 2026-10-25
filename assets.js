// Loads every image and sound in this folder. Paths are relative, so the game
// runs when index.html is opened straight from disk.
const SHIP_FILES = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `./space_cruiser_${n}.png`);
const POWER_UP_FILES = [1, 2, 3, 4, 5, 6].map(n => `./power_up_${n}.png`);

const IMAGE_FILES = {
    background: './space_world_background.png',
    playerBullet: './space_rocket_3.png',
    enemyBullet: './space_rocket_5.png',
    explosion: './big_explosion/big_explosion.png',
    heart: './lives_16.png',
    asteroid: './asteroid_big.png',
    spike: './spike_ball/spike_ball.png',
    planet: './planet_ringed.png'
};
const SOUND_FILES = {
    laser: './laser_1.mp3',
    explosion: './explosion_crunch_3.mp3',
    hit: './shield_hit.mp3',
    powerUp: './power_up_1.mp3',
    shield: './force_field_0.mp3',
    music: './space_adventure_music.mp3'
};

const ASSETS = { images: {}, sounds: {}, ships: [], powerUps: [] };

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not load image: ' + src));
        img.src = src;
    });
}

function loadSound(src) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.oncanplaythrough = () => resolve(audio);
        audio.onerror = () => reject(new Error('Could not load sound: ' + src));
        audio.src = src;
    });
}

async function loadAssets() {
    const imageEntries = Object.entries(IMAGE_FILES);
    const soundEntries = Object.entries(SOUND_FILES);
    const [images, sounds, ships, powerUps] = await Promise.all([
        Promise.all(imageEntries.map(([, src]) => loadImage(src))),
        Promise.all(soundEntries.map(([, src]) => loadSound(src))),
        Promise.all(SHIP_FILES.map(loadImage)),
        Promise.all(POWER_UP_FILES.map(loadImage))
    ]);
    imageEntries.forEach(([key], i) => { ASSETS.images[key] = images[i]; });
    soundEntries.forEach(([key], i) => { ASSETS.sounds[key] = sounds[i]; });
    ASSETS.ships = ships;
    ASSETS.powerUps = powerUps;
}
