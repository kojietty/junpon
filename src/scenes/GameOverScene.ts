import Phaser from 'phaser';
import { COLORS, STORAGE_KEYS, VIEWPORT } from '@/config/GameConfig';
import { RankingService } from '@/services/RankingService';

interface GameOverData {
  score: number;
}

const FONT = 'Fredoka, system-ui, sans-serif';

export class GameOverScene extends Phaser.Scene {
  private nicknameOverlay: HTMLDivElement | null = null;

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

    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    this.add
      .text(cx, 300, 'TIME UP!', {
        fontFamily: FONT,
        fontSize: '110px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 470, `SCORE  ${score}`, {
        fontFamily: FONT,
        fontSize: '72px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 570, `BEST  ${highScore}${isNewHigh ? '  🎉 NEW!' : ''}`, {
        fontFamily: FONT,
        fontSize: '44px',
        color: isNewHigh ? COLORS.textAccent : COLORS.textPrimary,
      })
      .setOrigin(0.5);

    // ランキング送信ボタン
    this.makeButton(cx, VIEWPORT.height - 500, 'ランキングに登録', COLORS.lane[3], () => {
      this.showNicknameOverlay(score);
    });

    // RETRY
    this.makeButton(cx, VIEWPORT.height - 380, 'RETRY', COLORS.lane[2], () => {
      this.scene.start('GameScene');
    });

    // TITLE
    this.makeButton(cx, VIEWPORT.height - 260, 'TITLE', 0x607d8b, () => {
      this.scene.start('TitleScene');
    });

    this.input.keyboard?.on('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'));

    // ゲーム終了から少し待って自動でニックネーム入力を表示する
    this.time.delayedCall(800, () => {
      this.showNicknameOverlay(score);
    });
  }

  private showNicknameOverlay(score: number): void {
    if (this.nicknameOverlay) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10,30,18,0.97);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 36px 44px;
      z-index: 9999;
      font-family: Fredoka, system-ui, sans-serif;
      color: #f5f5f5;
      text-align: center;
      min-width: 340px;
    `;
    overlay.innerHTML = `
      <div style="font-size:32px;font-weight:700;margin-bottom:8px;color:#ffd54f">名前を入力</div>
      <div style="font-size:24px;font-weight:bold;margin-bottom:20px;color:#f5f5f5">スコア: ${score}</div>
      <input id="nickname-input" type="text" maxlength="12" placeholder="名前（12文字以内）"
        value="${RankingService.getLastNickname()}"
        style="width:100%;box-sizing:border-box;font-family:Fredoka,sans-serif;font-size:28px;
               padding:10px 14px;border-radius:10px;border:2px solid #64b5f6;
               background:#0d2a18;color:#f5f5f5;outline:none;margin-bottom:20px">
      <div id="submit-error" style="color:#ff5252;font-size:22px;min-height:28px;margin-bottom:12px"></div>
      <div style="display:flex;gap:12px">
        <button id="btn-submit" style="flex:1;font-family:Fredoka,sans-serif;font-size:28px;font-weight:700;
          padding:12px;border:none;border-radius:12px;background:#ba68c8;color:#fff;cursor:pointer">
          送信
        </button>
        <button id="btn-skip" style="flex:1;font-family:Fredoka,sans-serif;font-size:28px;
          padding:12px;border:none;border-radius:12px;background:#607d8b;color:#fff;cursor:pointer">
          スキップ
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.nicknameOverlay = overlay;

    const input = overlay.querySelector<HTMLInputElement>('#nickname-input')!;
    const errorEl = overlay.querySelector<HTMLDivElement>('#submit-error')!;
    input.focus();
    input.select();

    overlay.querySelector('#btn-submit')!.addEventListener('click', async () => {
      const nickname = input.value.trim();
      if (!nickname) { errorEl.textContent = '名前を入力してください'; return; }
      errorEl.textContent = '送信中...';
      try {
        await RankingService.submit(nickname, score);
        this.removeNicknameOverlay();
        this.scene.start('RankingScene', { myScore: score, myNickname: nickname });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errorEl.textContent = msg === '429' ? '連続送信はできません' : '送信失敗。再試行してください';
      }
    });

    overlay.querySelector('#btn-skip')!.addEventListener('click', () => {
      this.removeNicknameOverlay();
    });
  }

  private removeNicknameOverlay(): void {
    if (this.nicknameOverlay) {
      this.nicknameOverlay.remove();
      this.nicknameOverlay = null;
    }
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): void {
    const w = 460;
    const h = 84;
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);

    this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#fff' })
      .setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bg.setAlpha(0.65));
    hit.on('pointerout', () => bg.setAlpha(1));
    hit.on('pointerdown', onClick);
  }

  shutdown(): void {
    this.removeNicknameOverlay();
  }

  private getHighScore(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.highScore);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  }
}
