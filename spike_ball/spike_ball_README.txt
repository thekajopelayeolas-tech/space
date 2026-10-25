Spike Ball is a 7-frame animation strip.
Each frame is 32 x 32 pixels, left to right.

PhaserJS:
  this.load.spritesheet('spike_ball', 'spike_ball.png', { frameWidth: 32, frameHeight: 32 });
  this.anims.create({ key: 'spike_ball', frames: this.anims.generateFrameNumbers('spike_ball'), frameRate: 6, repeat: -1 });
  this.add.sprite(100, 100, 'spike_ball').play('spike_ball');