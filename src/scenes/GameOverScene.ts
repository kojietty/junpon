import Phaser from 'phaser';
import { COLORS, STORAGE_KEYS, VIEWPORT } from '@/config/GameConfig';

interface GameOverData {
  score: number;
}

const FONT = 'Fredoka, system-ui, sans-serif';

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

    // background
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    this.add
      .text(cx, 320, 'TIME UP!', {
        fontFamily: FONT,
        fontSize: '110px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 490, `SCORE  ${score}`, {
        fontFamily: FONT,
        fontSize: '72px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 590, `BEST  ${highScore}${isNewHigh ? '  🎉 NEW!' : ''}`, {
        fontFamily: FONT,
        fontSize: '44px',
        color: isNewHigh ? COLORS.textAccent : COLORS.textPrimary,
      })
      .setOrigin(0.5);

    // RETRY button
    this.makeButton(cx, VIEWPORT.height - 440, 'RETRY', COLORS.lane[2], () => {
      this.scene.start('GameScene');
    });

    // TITLE button
    this.makeButton(cx, VIEWPORT.height - 320, 'TITLE', 0x607d8b, () => {
      this.scene.start('TitleScene');
    });

    // keyboard shortcuts
    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('GameScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): void {
    const w = 460;
    const h = 90;

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);

    this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const hit = this.add
      .rectangle(x, y, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bg.setAlpha(0.65));
    hit.on('pointerout', () => bg.setAlpha(1));
    hit.on('pointerdown', onClick);
  }

  private getHighScore(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.highScore);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  }
}
