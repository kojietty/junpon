import Phaser from 'phaser';
import { COLORS, VIEWPORT } from '@/config/GameConfig';

const FONT = 'Fredoka, system-ui, sans-serif';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    bg.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    // Brand title
    this.add
      .text(cx, cy - 120, 'JAMPON', {
        fontFamily: FONT,
        fontSize: '100px',
        fontStyle: 'bold',
        color: '#ffd54f',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 22, false, true);

    // "Loading..." with alpha pulse
    const loadingText = this.add
      .text(cx, cy + 40, 'Loading...', {
        fontFamily: FONT,
        fontSize: '38px',
        color: '#f5f5f5',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: loadingText,
      alpha: 0.35,
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Progress bar
    const barW = 440;
    const barH = 26;
    const barX = cx - barW / 2;
    const barY = cy + 110;

    // Frame
    const frameG = this.add.graphics();
    frameG.lineStyle(2, 0xffffff, 0.35);
    frameG.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 14);

    // Fill (redrawn on progress)
    const fillG = this.add.graphics();

    const drawFill = (value: number) => {
      fillG.clear();
      const fillW = Math.max(0, (barW - 4) * value);
      if (fillW < 2) return;
      const r = Math.min(10, fillW / 2);
      fillG.fillStyle(COLORS.jungleLight, 1);
      fillG.fillRoundedRect(barX + 2, barY + 2, fillW, barH - 4, r);
      // Top shine
      fillG.fillStyle(0xffffff, 0.22);
      fillG.fillRoundedRect(barX + 2, barY + 2, fillW, (barH - 4) / 2, r);
    };

    this.load.on('progress', drawFill);
    this.load.on('complete', () => drawFill(1));

    this.load.audio('bgm', 'assets/audio/BGM.mp3');
    this.load.audio('se-hit', 'assets/audio/SE.mp3');
  }

  create(): void {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
  }
}
