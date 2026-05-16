import Phaser from 'phaser';
import {
  COLORS,
  DEFAULT_MODE,
  MODES,
  STORAGE_KEYS,
  VIEWPORT,
  parseMode,
  type GameMode,
} from '@/config/GameConfig';
import { RankingService, type RankingEntry } from '@/services/RankingService';

interface RankingData {
  myScore?: number;
  myNickname?: string;
  initialMode?: GameMode;
}

const FONT = 'Fredoka, system-ui, sans-serif';
const MEDAL_COLORS = [0xffd700, 0xc8c8c8, 0xcd7f32] as const;
const TAB_Y = 150;
const HEADER_Y = 220;

export class RankingScene extends Phaser.Scene {
  private entriesCache: Partial<Record<GameMode, RankingEntry[]>> = {};
  private rowContainers: Phaser.GameObjects.Container[] = [];
  private headerContainer: Phaser.GameObjects.Container | null = null;
  private emptyText: Phaser.GameObjects.Text | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private tabButtons: Partial<
    Record<GameMode, { container: Phaser.GameObjects.Container; redraw: (active: boolean) => void }>
  > = {};
  private activeMode: GameMode = DEFAULT_MODE;
  private myScore?: number;
  private myNickname?: string;

  constructor() {
    super({ key: 'RankingScene' });
  }

  async create(data: RankingData): Promise<void> {
    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.entriesCache = {};
    this.rowContainers = [];
    this.headerContainer = null;
    this.emptyText = null;
    this.loadingText = null;
    this.tabButtons = {};
    this.myScore = data?.myScore;
    this.myNickname = data?.myNickname;
    this.activeMode =
      data?.initialMode ?? parseMode(localStorage.getItem(STORAGE_KEYS.lastMode)) ?? DEFAULT_MODE;

    const cx = VIEWPORT.width / 2;

    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    this.add
      .text(cx, 72, 'RANKING', {
        fontFamily: FONT,
        fontSize: '76px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 16, false, true);

    this.buildTabs(cx);

    this.makeButton(cx, VIEWPORT.height - 110, 'タイトルに戻る', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    await this.loadAndRender(this.activeMode);
  }

  private buildTabs(cx: number): void {
    const tabW = 200;
    const gap = 16;
    const left = cx - (tabW + gap / 2);
    const right = cx + gap / 2;

    this.tabButtons[2] = this.makeTab(left, TAB_Y, tabW, '2KEY', 2);
    this.tabButtons[4] = this.makeTab(right, TAB_Y, tabW, '4KEY', 4);
    this.refreshTabVisuals();
  }

  private makeTab(
    x: number,
    y: number,
    w: number,
    label: string,
    mode: GameMode,
  ): { container: Phaser.GameObjects.Container; redraw: (active: boolean) => void } {
    const h = 54;
    const activeColor = COLORS.lane[MODES[mode].colorIdx[0]];
    const bg = this.add.graphics();
    const text = this.add
      .text(w / 2, h / 2, label, {
        fontFamily: FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const redraw = (active: boolean) => {
      bg.clear();
      if (active) {
        bg.fillStyle(activeColor, 0.92);
        bg.fillRoundedRect(0, 0, w, h, 14);
        text.setColor('#ffffff');
      } else {
        bg.fillStyle(0x000000, 0.35);
        bg.fillRoundedRect(0, 0, w, h, 14);
        bg.lineStyle(2, 0xffffff, 0.25);
        bg.strokeRoundedRect(0, 0, w, h, 14);
        text.setColor('#bbbbbb');
      }
    };
    redraw(false);

    const hit = this.add
      .rectangle(0, 0, w, h, 0, 0)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.switchTab(mode));

    const container = this.add.container(x, y, [bg, text, hit]);
    return { container, redraw };
  }

  private refreshTabVisuals(): void {
    (Object.entries(this.tabButtons) as [string, { redraw: (a: boolean) => void }][]).forEach(
      ([m, btn]) => btn.redraw(Number(m) === this.activeMode),
    );
  }

  private async switchTab(mode: GameMode): Promise<void> {
    if (mode === this.activeMode) return;
    this.activeMode = mode;
    localStorage.setItem(STORAGE_KEYS.lastMode, String(mode));
    this.refreshTabVisuals();
    await this.loadAndRender(mode);
  }

  private async loadAndRender(mode: GameMode): Promise<void> {
    this.clearList();

    let entries = this.entriesCache[mode];
    if (!entries) {
      this.showLoading();
      const raw = await RankingService.fetchTop(mode);
      // モード切替中に他タブへ移動された場合は描画しない
      if (mode !== this.activeMode) {
        this.hideLoading();
        return;
      }
      const seen = new Set<string>();
      entries = raw.filter((entry) => {
        if (seen.has(entry.nickname)) return false;
        seen.add(entry.nickname);
        return true;
      });
      this.entriesCache[mode] = entries;
      this.hideLoading();
    }

    if (entries.length === 0) {
      this.emptyText = this.add
        .text(VIEWPORT.width / 2, VIEWPORT.height / 2, 'まだスコアがありません', {
          fontFamily: FONT,
          fontSize: '36px',
          color: COLORS.textPrimary,
        })
        .setOrigin(0.5);
      return;
    }
    this.drawList(entries);
  }

  private clearList(): void {
    this.rowContainers.forEach((c) => c.destroy());
    this.rowContainers = [];
    this.headerContainer?.destroy();
    this.headerContainer = null;
    this.emptyText?.destroy();
    this.emptyText = null;
  }

  private showLoading(): void {
    if (this.loadingText) return;
    this.loadingText = this.add
      .text(VIEWPORT.width / 2, VIEWPORT.height / 2, '読み込み中...', {
        fontFamily: FONT,
        fontSize: '40px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.loadingText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private hideLoading(): void {
    this.loadingText?.destroy();
    this.loadingText = null;
  }

  private drawList(entries: RankingEntry[]): void {
    const startY = HEADER_Y;
    const rowH = 64;
    const show = Math.min(entries.length, 13);

    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x000000, 0.45);
    headerBg.fillRoundedRect(16, 0, VIEWPORT.width - 32, rowH - 6, 10);

    const headerHash = this.add
      .text(50, rowH / 2, '#', { fontFamily: FONT, fontSize: '24px', color: '#888888' })
      .setOrigin(0.5);
    const headerName = this.add
      .text(108, rowH / 2, 'NAME', { fontFamily: FONT, fontSize: '24px', color: '#888888' })
      .setOrigin(0, 0.5);
    const headerScore = this.add
      .text(VIEWPORT.width - 52, rowH / 2, 'SCORE', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#888888',
      })
      .setOrigin(1, 0.5);

    this.headerContainer = this.add.container(0, startY, [
      headerBg,
      headerHash,
      headerName,
      headerScore,
    ]);

    for (let i = 0; i < show; i++) {
      const entry = entries[i];
      const targetY = startY + rowH + i * rowH;
      const isMe = entry.score === this.myScore && entry.nickname === this.myNickname;

      const row = this.add.container(0, targetY + 24);
      row.setAlpha(0);

      const rowBg = this.add.graphics();
      const bgColor = isMe ? COLORS.lane[2] : 0x000000;
      const bgAlpha = isMe ? 0.28 : i % 2 === 0 ? 0.2 : 0.12;
      rowBg.fillStyle(bgColor, bgAlpha);
      rowBg.fillRoundedRect(16, 2, VIEWPORT.width - 32, rowH - 6, 8);
      row.add(rowBg);

      if (i < 3) {
        const medalG = this.add.graphics();
        medalG.fillStyle(MEDAL_COLORS[i], 0.95);
        medalG.fillCircle(50, rowH / 2 - 2, 16);
        medalG.lineStyle(2, 0xffffff, 0.3);
        medalG.strokeCircle(50, rowH / 2 - 2, 16);
        row.add(medalG);
      }

      const rankText = this.add
        .text(50, rowH / 2 - 2, `${i + 1}`, {
          fontFamily: FONT,
          fontSize: '26px',
          fontStyle: 'bold',
          color: i < 3 ? '#111111' : COLORS.textPrimary,
        })
        .setOrigin(0.5);
      row.add(rankText);

      const nameColor = isMe ? COLORS.textAccent : COLORS.textPrimary;
      const nameText = this.add
        .text(108, rowH / 2 - 2, entry.nickname, {
          fontFamily: FONT,
          fontSize: '30px',
          color: nameColor,
        })
        .setOrigin(0, 0.5);
      row.add(nameText);

      const scoreText = this.add
        .text(VIEWPORT.width - 52, rowH / 2 - 2, String(entry.score), {
          fontFamily: FONT,
          fontSize: '30px',
          fontStyle: 'bold',
          color: nameColor,
        })
        .setOrigin(1, 0.5);
      row.add(scoreText);

      this.tweens.add({
        targets: row,
        y: targetY,
        alpha: 1,
        delay: i * 40,
        duration: 240,
        ease: 'Quad.easeOut',
      });

      this.rowContainers.push(row);
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
