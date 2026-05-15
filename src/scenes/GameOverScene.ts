import Phaser from 'phaser';
import { COLORS, STORAGE_KEYS, VIEWPORT } from '@/config/GameConfig';

interface GameOverData {
  score: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const cx = VIEWPORT.width / 2;
    const score = data.score ?? 0;
    const previousHigh = this.getHighScore();
    const isNewHigh = score > previousHigh;
    if (isNewHigh) localStorage.setItem(STORAGE_KEYS.highScore, String(score));
    const highScore = isNewHigh ? score : previousHigh;

    this.add
      .text(cx, 360, 'TIME UP!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '110px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 520, `SCORE: ${score}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 620, `HIGH: ${highScore}${isNewHigh ? '  NEW!' : ''}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: isNewHigh ? COLORS.textAccent : COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const retry = this.add
      .text(cx, VIEWPORT.height - 360, 'TAP TO RETRY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: retry, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(cx, VIEWPORT.height - 260, 'HOLD TO TITLE', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    let pressedAt = 0;
    this.input.on('pointerdown', () => {
      pressedAt = this.time.now;
    });
    this.input.on('pointerup', () => {
      const held = this.time.now - pressedAt;
      this.scene.start(held > 600 ? 'TitleScene' : 'GameScene');
    });
    this.input.keyboard?.once('keydown', () => this.scene.start('GameScene'));
  }

  private getHighScore(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.highScore);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  }
}
