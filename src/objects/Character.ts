import Phaser from 'phaser';
import { COLORS, LANES, type LaneKey } from '@/config/GameConfig';

export type { LaneKey };

export class Character extends Phaser.GameObjects.Container {
  readonly lane: LaneKey;

  constructor(scene: Phaser.Scene, x: number, y: number, lane: LaneKey) {
    super(scene, x, y);
    this.lane = lane;

    const body = scene.add
      .circle(0, 0, 56, COLORS.lane[lane])
      .setStrokeStyle(4, 0xffffff, 0.85);
    const label = scene.add
      .text(0, 0, LANES.keys[lane], {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add([body, label]);
    scene.add.existing(this);
  }
}
