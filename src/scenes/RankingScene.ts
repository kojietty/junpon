import Phaser from 'phaser';
import { COLORS, VIEWPORT } from '@/config/GameConfig';
import { RankingService, type RankingEntry } from '@/services/RankingService';

interface RankingData {
  myScore?: number;
  myNickname?: string;
}

const FONT = 'Fredoka, system-ui, sans-serif';

export class RankingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RankingScene' });
  }

  async create(data: RankingData): Promise<void> {
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
      .setOrigin(0.5);

    const loadingText = this.add
      .text(cx, VIEWPORT.height / 2, '読み込み中...', {
        fontFamily: FONT,
        fontSize: '40px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const entries = await RankingService.fetchTop();
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
      this.scene.start('TitleScene');
    });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  private drawList(
    entries: RankingEntry[],
    myScore: number | undefined,
    myNickname: string | undefined,
  ): void {
    const startY = 170;
    const rowH = 72;
    const show = Math.min(entries.length, 13);

    // header
    const headerG = this.add.graphics();
    headerG.fillStyle(0x000000, 0.3);
    headerG.fillRect(20, startY - 8, VIEWPORT.width - 40, rowH - 8);

    this.add.text(60, startY + 8, '#', { fontFamily: FONT, fontSize: '28px', color: '#aaa' });
    this.add.text(120, startY + 8, 'NAME', { fontFamily: FONT, fontSize: '28px', color: '#aaa' });
    this.add
      .text(VIEWPORT.width - 60, startY + 8, 'SCORE', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#aaa',
      })
      .setOrigin(1, 0);

    for (let i = 0; i < show; i++) {
      const entry = entries[i];
      const y = startY + rowH + i * rowH;
      const isMe = entry.score === myScore && entry.nickname === myNickname;

      if (isMe) {
        const hl = this.add.graphics();
        hl.fillStyle(COLORS.lane[2], 0.25);
        hl.fillRoundedRect(20, y - 4, VIEWPORT.width - 40, rowH - 10, 8);
      }

      const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : COLORS.textPrimary;
      const nameColor = isMe ? COLORS.textAccent : COLORS.textPrimary;

      this.add.text(60, y + 4, `${i + 1}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: rankColor,
      });
      this.add.text(120, y + 4, entry.nickname, {
        fontFamily: FONT,
        fontSize: '34px',
        color: nameColor,
      });
      this.add
        .text(VIEWPORT.width - 60, y + 4, String(entry.score), {
          fontFamily: FONT,
          fontSize: '34px',
          fontStyle: 'bold',
          color: nameColor,
        })
        .setOrigin(1, 0);
    }
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const w = 460;
    const h = 84;
    const bg = this.add.graphics();
    bg.fillStyle(0x607d8b, 0.9);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);

    this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#fff' })
      .setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bg.setAlpha(0.65));
    hit.on('pointerout', () => bg.setAlpha(1));
    hit.on('pointerdown', onClick);
  }
}
