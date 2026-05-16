import Phaser from 'phaser';
import { COLORS, VIEWPORT } from '@/config/GameConfig';
import { RankingService, type RankingEntry } from '@/services/RankingService';

interface RankingData {
  myScore?: number;
  myNickname?: string;
}

const FONT = 'Fredoka, system-ui, sans-serif';
const MEDAL_COLORS = [0xffd700, 0xc8c8c8, 0xcd7f32] as const;

export class RankingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RankingScene' });
  }

  async create(data: RankingData): Promise<void> {
    this.cameras.main.fadeIn(220, 0, 0, 0);

    const cx = VIEWPORT.width / 2;

    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    this.add
      .text(cx, 72, 'RANKING', {
        fontFamily: FONT,
        fontSize: '80px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 16, false, true);

    // Loading indicator with pulse
    const loadingText = this.add
      .text(cx, VIEWPORT.height / 2, '読み込み中...', {
        fontFamily: FONT,
        fontSize: '40px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: loadingText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const rawEntries = await RankingService.fetchTop();
    const seenNames = new Set<string>();
    const entries = rawEntries.filter((entry) => {
      if (seenNames.has(entry.nickname)) return false;
      seenNames.add(entry.nickname);
      return true;
    });
    loadingText.destroy();

    if (entries.length === 0) {
      this.add
        .text(cx, VIEWPORT.height / 2, 'まだスコアがありません', {
          fontFamily: FONT,
          fontSize: '36px',
          color: COLORS.textPrimary,
        })
        .setOrigin(0.5);
    } else {
      this.drawList(entries, data.myScore, data.myNickname);
    }

    this.makeButton(cx, VIEWPORT.height - 110, 'タイトルに戻る', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });
  }

  private drawList(
    entries: RankingEntry[],
    myScore: number | undefined,
    myNickname: string | undefined,
  ): void {
    const startY = 162;
    const rowH = 70;
    const show = Math.min(entries.length, 13);

    // Header card
    const headerG = this.add.graphics();
    headerG.fillStyle(0x000000, 0.45);
    headerG.fillRoundedRect(16, startY, VIEWPORT.width - 32, rowH - 6, 10);

    this.add
      .text(50, startY + rowH / 2, '#', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#888888',
      })
      .setOrigin(0.5);
    this.add
      .text(108, startY + rowH / 2, 'NAME', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#888888',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(VIEWPORT.width - 52, startY + rowH / 2, 'SCORE', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#888888',
      })
      .setOrigin(1, 0.5);

    for (let i = 0; i < show; i++) {
      const entry = entries[i];
      const targetY = startY + rowH + i * rowH;
      const isMe = entry.score === myScore && entry.nickname === myNickname;

      // Row container — starts 24px below, slides up into position
      const row = this.add.container(0, targetY + 24);
      row.setAlpha(0);

      // Row background
      const rowBg = this.add.graphics();
      const bgColor = isMe ? COLORS.lane[2] : 0x000000;
      const bgAlpha = isMe ? 0.28 : i % 2 === 0 ? 0.2 : 0.12;
      rowBg.fillStyle(bgColor, bgAlpha);
      rowBg.fillRoundedRect(16, 2, VIEWPORT.width - 32, rowH - 6, 8);
      row.add(rowBg);

      // Medal badge for top 3
      if (i < 3) {
        const medalG = this.add.graphics();
        medalG.fillStyle(MEDAL_COLORS[i], 0.95);
        medalG.fillCircle(50, rowH / 2 - 2, 18);
        medalG.lineStyle(2, 0xffffff, 0.3);
        medalG.strokeCircle(50, rowH / 2 - 2, 18);
        row.add(medalG);
      }

      // Rank number
      const rankText = this.add
        .text(50, rowH / 2 - 2, `${i + 1}`, {
          fontFamily: FONT,
          fontSize: '28px',
          fontStyle: 'bold',
          color: i < 3 ? '#111111' : COLORS.textPrimary,
        })
        .setOrigin(0.5);
      row.add(rankText);

      // Name
      const nameColor = isMe ? COLORS.textAccent : COLORS.textPrimary;
      const nameText = this.add
        .text(108, rowH / 2 - 2, entry.nickname, {
          fontFamily: FONT,
          fontSize: '32px',
          color: nameColor,
        })
        .setOrigin(0, 0.5);
      row.add(nameText);

      // Score
      const scoreText = this.add
        .text(VIEWPORT.width - 52, rowH / 2 - 2, String(entry.score), {
          fontFamily: FONT,
          fontSize: '32px',
          fontStyle: 'bold',
          color: nameColor,
        })
        .setOrigin(1, 0.5);
      row.add(scoreText);

      // Stagger entrance: slide up + fade in
      this.tweens.add({
        targets: row,
        y: targetY,
        alpha: 1,
        delay: i * 55,
        duration: 270,
        ease: 'Quad.easeOut',
      });
    }
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 460;
    const h = 84;

    const bg = this.add.graphics();
    const drawBg = (alpha: number) => {
      bg.clear();
      bg.fillStyle(0x607d8b, alpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(2, 0xffffff, 0.2);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.fillStyle(0xffffff, 0.1);
      bg.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, 18, { tl: 12, tr: 12, bl: 0, br: 0 });
    };
    drawBg(0.9);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '46px',
        fontStyle: 'bold',
        color: '#fff',
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y);
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    container.add([bg, text, hit]);

    hit.on('pointerover', () => {
      drawBg(1.0);
      this.tweens.add({ targets: container, scale: 1.05, duration: 120, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      drawBg(0.9);
      this.tweens.add({ targets: container, scale: 1.0, duration: 120 });
    });
    hit.on('pointerdown', onClick);

    return container;
  }
}
