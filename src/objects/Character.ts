import Phaser from 'phaser';
import { COLORS, LANES, type LaneKey } from '@/config/GameConfig';

export type { LaneKey };

const NOTE_W = 110;
const NOTE_H = 110;
const NOTE_R = 20;

export class Character extends Phaser.GameObjects.Container {
  readonly lane: LaneKey;

  constructor(scene: Phaser.Scene, x: number, y: number, lane: LaneKey) {
    super(scene, x, y);
    this.lane = lane;

    const color = COLORS.lane[lane];

    const bg = scene.add.graphics();
    bg.fillStyle(color, 0.95);
    bg.fillRoundedRect(-NOTE_W / 2, -NOTE_H / 2, NOTE_W, NOTE_H, NOTE_R);
    bg.lineStyle(4, 0xffffff, 0.65);
    bg.strokeRoundedRect(-NOTE_W / 2, -NOTE_H / 2, NOTE_W, NOTE_H, NOTE_R);

    // Inner top highlight for glass effect
    const shine = scene.add.graphics();
    shine.fillStyle(0xffffff, 0.2);
    shine.fillRoundedRect(
      -NOTE_W / 2 + 6,
      -NOTE_H / 2 + 6,
      NOTE_W - 12,
      26,
      { tl: 12, tr: 12, bl: 0, br: 0 },
    );

    const label = scene.add
      .text(0, 2, LANES.keys[lane], {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '58px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add([bg, shine, label]);
    scene.add.existing(this);
  }
}
