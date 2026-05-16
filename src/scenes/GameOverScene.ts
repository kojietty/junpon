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

    // "TIME UP!" with scale-in entrance
    const timeUpText = this.add
      .text(cx, 290, 'TIME UP!', {
        fontFamily: FONT,
        fontSize: '110px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(1.8)
      .setShadow(0, 0, '#ffd54f', 20, false, true);

    this.tweens.add({
      targets: timeUpText,
      alpha: 1,
      scale: 1,
      delay: 100,
      duration: 420,
      ease: 'Back.easeOut',
    });

    // Score label
    const scoreLabel = this.add
      .text(cx, 445, 'SCORE', {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Score number — counts up from 0
    const scoreDisplay = this.add
      .text(cx, 520, '0', {
        fontFamily: FONT,
        fontSize: '100px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: [scoreLabel, scoreDisplay], alpha: 1, delay: 420, duration: 300 });

    // Best score row — shown after count-up completes
    const bestText = this.add
      .text(cx, 648, `BEST  ${highScore}${isNewHigh ? '  ★ NEW!' : ''}`, {
        fontFamily: FONT,
        fontSize: '44px',
        color: isNewHigh ? COLORS.textAccent : COLORS.textPrimary,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    if (isNewHigh) {
      bestText.setShadow(0, 0, '#ffd54f', 12, false, true);
    }

    const countDuration = Math.min(1200, Math.max(500, score * 22));
    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: countDuration,
      delay: 620,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        scoreDisplay.setText(String(Math.round(tween.getValue() ?? 0)));
      },
      onComplete: () => {
        // Final pop on the number
        this.tweens.add({
          targets: scoreDisplay,
          scale: 1.2,
          duration: 110,
          yoyo: true,
          ease: 'Back.easeOut',
        });

        this.tweens.add({ targets: bestText, alpha: 1, duration: 400 });

        if (isNewHigh) {
          this.spawnConfetti(cx, 520);
        }
      },
    });

    // Buttons — staggered entrance
    const rankingBtn = this.makeButton(cx, VIEWPORT.height - 500, 'ランキングに登録', COLORS.lane[3], () => {
      this.showNicknameOverlay(score);
    });
    const retryBtn = this.makeButton(cx, VIEWPORT.height - 378, 'RETRY', COLORS.lane[2], () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    });
    const titleBtn = this.makeButton(cx, VIEWPORT.height - 258, 'TITLE', 0x607d8b, () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    [rankingBtn, retryBtn, titleBtn].forEach((btn, i) => {
      btn.setAlpha(0).setScale(0.88);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        scale: 1,
        delay: 1100 + i * 110,
        duration: 320,
        ease: 'Back.easeOut',
      });
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    this.time.delayedCall(800, () => {
      this.showNicknameOverlay(score);
    });

    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private spawnConfetti(cx: number, y: number): void {
    COLORS.lane.forEach((color, i) => {
      const key = `confetti-${i}`;
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({});
        g.fillStyle(color);
        g.fillRect(0, 0, 10, 6);
        g.generateTexture(key, 10, 6);
        g.destroy();
      }

      const emitter = this.add.particles(cx, y, key, {
        speed: { min: 200, max: 500 },
        angle: { min: -165, max: -15 },
        gravityY: 360,
        scale: { start: 1, end: 0.3 },
        alpha: { start: 1, end: 0.4 },
        lifespan: 2100,
        quantity: 12,
        emitting: false,
      });
      emitter.setDepth(20);
      this.time.delayedCall(i * 65, () => {
        emitter.emitParticleAt(cx, y, 15);
      });
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 460;
    const h = 84;

    const bg = this.add.graphics();
    const drawBg = (alpha: number) => {
      bg.clear();
      bg.fillStyle(color, alpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(2, 0xffffff, 0.2);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.fillStyle(0xffffff, 0.1);
      bg.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, 18, { tl: 12, tr: 12, bl: 0, br: 0 });
    };
    drawBg(0.9);

    const text = this.add
      .text(0, 0, label, { fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#fff' })
      .setOrigin(0.5);

    const container = this.add.container(x, y);
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    container.add([bg, text, hit]);

    hit.on('pointerover', () => {
      drawBg(1.0);
      this.tweens.add({ targets: container, scale: 1.06, duration: 120, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      drawBg(0.9);
      this.tweens.add({ targets: container, scale: 1.0, duration: 120 });
    });
    hit.on('pointerdown', onClick);

    return container;
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

  shutdown(): void {
    this.removeNicknameOverlay();
  }

  private getHighScore(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.highScore);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  }
}
