import Phaser from 'phaser';
import { COLORS, STORAGE_KEYS, VIEWPORT } from '@/config/GameConfig';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = VIEWPORT.width / 2;

    this.add
      .text(cx, 260, 'JUNGLE TAP', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '120px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 380, 'S D J K キーで下のノーツを消そう', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 440, '60秒で何点取れるか挑戦！', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const highScore = this.getHighScore();
    this.add
      .text(cx, 500, `HIGH SCORE: ${highScore}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(cx, VIEWPORT.height - 280, 'TAP TO START', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => this.scene.start('GameScene'));
    this.input.keyboard?.once('keydown', () => this.scene.start('GameScene'));
  }

  private getHighScore(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.highScore);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  }
}
