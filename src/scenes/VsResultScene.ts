import Phaser from 'phaser';
import { COLORS, VIEWPORT, VS, type GameMode } from '@/config/GameConfig';
import { VsApiError, VsService, type ParticipantInfo, type RoomState } from '@/services/VsService';

const FONT = 'Fredoka, system-ui, sans-serif';

export interface VsResultData {
  code: string;
  token: string;
  slot: number;
  mode: GameMode;
  maxPlayers: number;
  myNickname: string;
  myScore: number;
  plays: number;
  retired: boolean;
}

export class VsResultScene extends Phaser.Scene {
  private params!: VsResultData;
  private pollTimer?: Phaser.Time.TimerEvent;
  private resolvedAt = 0;
  private listContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private submittedOk = false;
  private finalized = false;

  constructor() {
    super({ key: 'VsResultScene' });
  }

  create(data: VsResultData): void {
    this.params = data;
    // params に統一して以降は this.params を使う
    this.submittedOk = false;
    this.finalized = false;
    this.resolvedAt = Date.now() + VS.resultTimeoutMs;

    const cx = VIEWPORT.width / 2;
    this.drawBackground();

    this.add
      .text(cx, 130, data.retired ? 'リタイア' : 'TIME UP!', {
        fontFamily: FONT,
        fontSize: '76px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 18, false, true);

    this.add
      .text(cx, 220, `あなたのスコア: ${data.myScore}`, {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#f5f5f5',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(cx, 290, '結果集計中...', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 360, 'RANKING', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.listContainer = this.add.container(0, 410);

    this.makeButton(cx, VIEWPORT.height - 220, 'もう一度', COLORS.lane[2], () => this.backToMenu());
    this.makeButton(cx, VIEWPORT.height - 120, 'タイトルに戻る', 0x607d8b, () =>
      this.backToTitle(),
    );

    this.cameras.main.fadeIn(220, 0, 0, 0);

    void this.submitWithRetry();
    this.pollTimer = this.time.addEvent({
      delay: VS.pollIntervalMs,
      loop: true,
      callback: () => this.pollNow(),
    });
    this.pollNow();
    this.events.on('shutdown', () => this.cleanup());
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private async submitWithRetry(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      try {
        await VsService.submitScore(
          this.params.code,
          this.params.token,
          this.params.myScore,
          this.params.plays,
        );
        this.submittedOk = true;
        return;
      } catch (e) {
        if (e instanceof VsApiError && (e.status === 400 || e.status === 403 || e.status === 404)) {
          // 二重送信 / 期限切れ / 認証エラーはリトライしても無駄
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  private async pollNow(): Promise<void> {
    if (this.finalized) return;
    try {
      const state = await VsService.getRoom(this.params.code);
      this.applyState(state);
    } catch (e) {
      if (e instanceof VsApiError && (e.status === 404 || e.status === 410)) {
        // ルーム消失 → 自分のスコアだけ表示
        this.renderFinal([
          {
            slot: this.params.slot,
            nickname: this.params.myNickname,
            score: this.params.myScore,
            dnf: this.params.retired,
          },
        ]);
      }
    }
  }

  private applyState(state: RoomState): void {
    this.renderRanking(state.participants);

    const allSubmitted = state.participants.every((p) => p.score !== null);
    if (state.status === 'finished' || allSubmitted) {
      this.renderFinal(state.participants);
      return;
    }

    const waiting = state.participants.filter((p) => p.score === null).length;
    if (Date.now() > this.resolvedAt) {
      // 120秒待ってもまだ揃わない → 未送信は dnf 扱いで打ち切り
      const closed = state.participants.map((p) =>
        p.score === null ? { ...p, score: 0, dnf: true } : p,
      );
      this.renderFinal(closed);
      return;
    }
    this.statusText.setText(`残り${waiting}人を待っています...`);
  }

  private renderRanking(participants: ParticipantInfo[]): void {
    this.listContainer.removeAll(true);

    const sorted = [...participants].sort((a, b) => {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      return sb - sa;
    });

    const cx = VIEWPORT.width / 2;
    const rowH = 56;
    const rowW = 600;

    // 同点同順位
    let lastScore = Number.POSITIVE_INFINITY;
    let lastRank = 0;
    sorted.forEach((p, i) => {
      const effective = p.score ?? -1;
      const rank = effective === lastScore ? lastRank : i + 1;
      lastScore = effective;
      lastRank = rank;

      const y = i * rowH;
      const isMe = p.slot === this.params.slot;
      const bg = this.add.graphics();
      bg.fillStyle(isMe ? 0xba68c8 : 0x1f3527, isMe ? 0.55 : 0.6);
      bg.fillRoundedRect(cx - rowW / 2, y, rowW, rowH - 8, 10);

      const rankLabel = p.score === null ? '–' : `${rank}`;
      const rankText = this.add
        .text(cx - rowW / 2 + 24, y + (rowH - 8) / 2, rankLabel, {
          fontFamily: FONT,
          fontSize: '30px',
          fontStyle: 'bold',
          color: COLORS.textAccent,
        })
        .setOrigin(0, 0.5);

      const nameText = this.add
        .text(cx - rowW / 2 + 90, y + (rowH - 8) / 2, p.nickname + (isMe ? ' (あなた)' : ''), {
          fontFamily: FONT,
          fontSize: '26px',
          color: '#f5f5f5',
        })
        .setOrigin(0, 0.5);

      const scoreLabel = p.score === null ? '待機中' : p.dnf ? `${p.score} (DNF)` : `${p.score}`;
      const scoreText = this.add
        .text(cx + rowW / 2 - 24, y + (rowH - 8) / 2, scoreLabel, {
          fontFamily: FONT,
          fontSize: '28px',
          fontStyle: 'bold',
          color: p.score === null ? '#888' : '#ffffff',
        })
        .setOrigin(1, 0.5);

      this.listContainer.add([bg, rankText, nameText, scoreText]);
    });
  }

  private renderFinal(participants: ParticipantInfo[]): void {
    if (this.finalized) return;
    this.finalized = true;
    this.cleanup();
    this.renderRanking(participants);

    const sorted = [...participants].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const mine = sorted.find((p) => p.slot === this.params.slot);
    const myRank = mine ? sorted.findIndex((p) => p === mine) + 1 : -1;
    const topScore = sorted[0]?.score ?? 0;
    const myScore = mine?.score ?? 0;

    let label: string;
    let color: string;
    if (myRank === 1 && sorted.filter((p) => (p.score ?? -1) === topScore).length === 1) {
      label = 'WIN!';
      color = COLORS.textAccent;
    } else if (myScore === topScore && topScore > 0) {
      label = 'DRAW';
      color = '#64b5f6';
    } else {
      label = `${myRank}位`;
      color = '#f5f5f5';
    }
    this.statusText.setText(label).setColor(color).setFontSize(34);
    if (!this.submittedOk && !this.params.retired) {
      this.statusText.setText(`${label}  (送信失敗)`);
    }
  }

  private backToMenu(): void {
    this.cleanup();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VsMenuScene'));
  }

  private backToTitle(): void {
    this.cleanup();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
  }

  private cleanup(): void {
    this.pollTimer?.remove();
    this.pollTimer = undefined;
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 460;
    const h = 76;
    const bg = this.add.graphics();
    const drawBg = (alpha: number) => {
      bg.clear();
      bg.fillStyle(color, alpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(2, 0xffffff, 0.25);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.fillStyle(0xffffff, 0.12);
      bg.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, 16, {
        tl: 12,
        tr: 12,
        bl: 0,
        br: 0,
      });
    };
    drawBg(0.9);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y);
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    container.add([bg, text, hit]);
    hit.on('pointerover', () => {
      drawBg(1);
      this.tweens.add({ targets: container, scale: 1.06, duration: 130, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      drawBg(0.9);
      this.tweens.add({ targets: container, scale: 1, duration: 130 });
    });
    hit.on('pointerdown', onClick);
    return container;
  }
}
