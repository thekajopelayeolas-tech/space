Big Explosion is a 9-frame animation strip.
Each frame is 128 x 128 pixels, left to right.

PhaserJS:
  this.load.spritesheet('big_explosion', 'big_explosion.png', { frameWidth: 128, frameHeight: 128 });
  this.anims.create({ key: 'big_explosion', frames: this.anims.generateFrameNumbers('big_explosion'), frameRate: 6, repeat: -1 });
  this.add.sprite(100, 100, 'big_explosion').play('big_explosion');