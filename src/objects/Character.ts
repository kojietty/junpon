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
    bg.lineStyle(4, 0xffffff, 0.7);
    bg.strokeRoundedRect(-NOTE_W / 2, -NOTE_H / 2, NOTE_W, NOTE_H, NOTE_R);

    const label = scene.add
      .text(0, 2, LANES.keys[lane], {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '58px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add([bg, label]);
    scene.add.existing(this);
  }
}
