import Phaser from 'phaser';
import { COLORS, VIEWPORT } from '@/config/GameConfig';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2;

    this.add
      .text(cx, cy - 40, 'Loading...', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const barWidth = 400;
    const barHeight = 24;
    const barX = cx - barWidth / 2;
    const barY = cy + 20;

    const frame = this.add
      .rectangle(cx, barY + barHeight / 2, barWidth + 8, barHeight + 8)
      .setStrokeStyle(2, 0xffffff);
    const fill = this.add.rectangle(barX, barY, 0, barHeight, COLORS.jungleLight).setOrigin(0, 0);

    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value;
    });

    this.load.on('complete', () => {
      frame.destroy();
      fill.destroy();
    });

    this.load.audio('bgm', 'assets/audio/BGM.mp3');
    this.load.audio('se-hit', 'assets/audio/SE.mp3');
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
