import Phaser from 'phaser';
import {
  COLORS,
  DEFAULT_MODE,
  DIFFICULTY,
  MODES,
  SESSION_DURATION_MS,
  VIEWPORT,
  type GameMode,
  type LaneKey,
} from '@/config/GameConfig';
import { CharacterStack } from '@/objects/CharacterStack';
import { InputController } from '@/systems/InputController';
import { ScoreManager } from '@/systems/ScoreManager';
import { SoundSettings } from '@/systems/SoundSettings';

interface GameSceneData {
  mode?: GameMode;
}

const FONT = 'Fredoka, system-ui, sans-serif';

const toHex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export class GameScene extends Phaser.Scene {
  private mode: GameMode = DEFAULT_MODE;
  private stack!: CharacterStack;
  private scoreManager!: ScoreManager;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private sessionTimer!: Phaser.Time.TimerEvent;
  private bgm!: Phaser.Sound.BaseSound;
  private pauseMenu!: Phaser.GameObjects.Container;
  private volumeOverlay: HTMLDivElement | null = null;
  private isPaused = false;
  private isCountingDown = false;
  private emitters: Partial<Record<LaneKey, Phaser.GameObjects.Particles.ParticleEmitter>> = {};
  private keyCaps: Phaser.GameObjects.Container[] = [];
  private lastTimerSecs = 61;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data: GameSceneData): void {
    this.mode = data?.mode ?? DEFAULT_MODE;
    this.isPaused = false;
    this.emitters = {};
    this.keyCaps = [];
    this.lastTimerSecs = 61;

    this.drawBackground();
    this.createParticleEmitters();
    this.drawLaneZones();

    this.stack = new CharacterStack(this, {
      x: VIEWPORT.width / 2,
      bottomY: VIEWPORT.height - 300,
      visibleCount: DIFFICULTY.stackVisibleCount,
      mode: this.mode,
    });
    this.stack.fillInitial();

    this.scoreManager = new ScoreManager();

    // HUD background panel
    const hudG = this.add.graphics();
    hudG.fillStyle(0x000000, 0.42);
    hudG.fillRoundedRect(16, 14, VIEWPORT.width - 32, 208, 20);

    // ESC hint
    this.add
      .text(44, 38, '≡ ESC', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ffffff',
        alpha: 0.4,
      } as Phaser.Types.GameObjects.Text.TextStyle)
      .setOrigin(0, 0);

    this.scoreText = this.add
      .text(VIEWPORT.width / 2, 90, 'SCORE 0', {
        fontFamily: FONT,
        fontSize: '58px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.comboText = this.add
      .text(VIEWPORT.width / 2, 165, '', {
        fontFamily: FONT,
        fontSize: '40px',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.timerText = this.add
      .text(VIEWPORT.width - 40, 38, '60', {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(1, 0);

    new InputController(this, (lane) => this.onInput(lane), this.mode);
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());

    this.createPauseMenu();
    this.startCountdown();
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private startCountdown(): void {
    this.isCountingDown = true;
    this.isPaused = true;

    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2 - 60;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.58);
    overlay.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    overlay.setDepth(99);

    const countText = this.add
      .text(cx, cy, '3', {
        fontFamily: FONT,
        fontSize: '200px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setShadow(0, 0, '#ffd54f', 28, true, true);

    let count = 3;
    const tick = () => {
      countText.setScale(1.7).setAlpha(0.5);
      this.tweens.add({
        targets: countText,
        scale: 1,
        alpha: 1,
        duration: 360,
        ease: 'Back.easeOut',
      });
    };

    tick();

    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        count--;
        if (count > 0) {
          countText.setText(String(count));
          tick();
        } else if (count === 0) {
          countText.setText('GO!');
          countText.setColor('#64b5f6').setShadow(0, 0, '#64b5f6', 28, true, true);
          tick();
          this.startGame();
        } else {
          this.tweens.add({
            targets: [countText, overlay],
            alpha: 0,
            duration: 320,
            onComplete: () => {
              countText.destroy();
              overlay.destroy();
            },
          });
        }
      },
    });
  }

  private startGame(): void {
    this.isCountingDown = false;
    this.isPaused = false;
    this.sessionTimer = this.time.delayedCall(SESSION_DURATION_MS, () => this.endSession());
    this.bgm = this.sound.add('bgm', { loop: true, volume: SoundSettings.bgmVolume() });
    this.bgm.play();
  }

  private createParticleEmitters(): void {
    const modeCfg = MODES[this.mode];
    for (let lane = 0; lane < modeCfg.count; lane++) {
      const color = COLORS.lane[modeCfg.colorIdx[lane]];
      const key = `particle-lane-${this.mode}-${lane}`;
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({});
        g.fillStyle(color);
        g.fillCircle(6, 6, 6);
        g.generateTexture(key, 12, 12);
        g.destroy();
      }

      const emitter = this.add.particles(0, 0, key, {
        speed: { min: 100, max: 310 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.9, end: 0 },
        lifespan: 430,
        quantity: 14,
        emitting: false,
      });
      emitter.setDepth(10);
      this.emitters[lane as LaneKey] = emitter;
    }
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(
      COLORS.jungleDark,
      COLORS.jungleDark,
      COLORS.background,
      COLORS.background,
    );
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private drawLaneZones(): void {
    const modeCfg = MODES[this.mode];
    const laneWidth = VIEWPORT.width / modeCfg.count;
    // 2 キーモードではレーン幅が大きすぎてキャップが間延びするので上限を設ける
    const capW = Math.min(laneWidth - 16, 240);
    const capH = 72;
    const capY = VIEWPORT.height - 52;

    for (let i = 0; i < modeCfg.count; i++) {
      const color = COLORS.lane[modeCfg.colorIdx[i]];
      const cx = i * laneWidth + laneWidth / 2;

      const capG = this.add.graphics();
      capG.fillStyle(color, 0.92);
      capG.fillRoundedRect(-capW / 2, -capH / 2, capW, capH, 14);
      capG.lineStyle(3, 0xffffff, 0.6);
      capG.strokeRoundedRect(-capW / 2, -capH / 2, capW, capH, 14);
      capG.fillStyle(0xffffff, 0.18);
      capG.fillRoundedRect(-capW / 2 + 4, -capH / 2 + 4, capW - 8, 16, { tl: 8, tr: 8, bl: 0, br: 0 });

      const keyText = this.add
        .text(0, 0, modeCfg.keys[i], {
          fontFamily: FONT,
          fontSize: '52px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      const container = this.add.container(cx, capY, [capG, keyText]);
      this.keyCaps.push(container);
    }
  }

  private createPauseMenu(): void {
    const cx = VIEWPORT.width / 2;
    const panelW = 560;
    const panelH = 520;
    const panelX = cx - panelW / 2;
    const panelY = 240;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.88);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
    bg.lineStyle(2, 0xffffff, 0.12);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    const title = this.add
      .text(cx, panelY + 56, 'PAUSE', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 12, false, true);

    const btnRetry = this.makePauseBtn(cx, panelY + 168, 'やりなおす', COLORS.lane[1], () => {
      this.removeVolumeOverlay();
      this.bgm.stop();
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () =>
        this.scene.start('GameScene', { mode: this.mode }),
      );
    });

    const btnTitle = this.makePauseBtn(cx, panelY + 268, 'タイトルに戻る', 0x607d8b, () => {
      this.removeVolumeOverlay();
      this.bgm.stop();
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    const btnVolume = this.makePauseBtn(cx, panelY + 368, '音量設定', COLORS.lane[2], () => {
      this.toggleVolumeOverlay();
    });

    const closeHint = this.add
      .text(cx, panelY + panelH - 38, 'ESC で閉じる', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#777777',
      })
      .setOrigin(0.5);

    this.pauseMenu = this.add.container(0, 0, [
      bg,
      title,
      btnRetry,
      btnTitle,
      btnVolume,
      closeHint,
    ]);
    this.pauseMenu.setVisible(false).setDepth(20);
  }

  private makePauseBtn(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 420;
    const h = 72;
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.85);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);

    const text = this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const hitArea = this.add
      .rectangle(x, y, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => bg.setAlpha(0.65));
    hitArea.on('pointerout', () => bg.setAlpha(1));
    hitArea.on('pointerdown', onClick);

    return this.add.container(0, 0, [bg, text, hitArea]);
  }

  private togglePause(): void {
    if (this.isCountingDown) return;
    if (this.isPaused) {
      this.closePause();
    } else {
      this.openPause();
    }
  }

  private openPause(): void {
    this.isPaused = true;
    (this.bgm as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).pause?.();
    this.pauseMenu.setVisible(true);
  }

  private closePause(): void {
    this.isPaused = false;
    (this.bgm as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).resume?.();
    this.pauseMenu.setVisible(false);
    this.removeVolumeOverlay();
  }

  private toggleVolumeOverlay(): void {
    if (this.volumeOverlay) {
      this.removeVolumeOverlay();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'vol-overlay';
    overlay.style.cssText = `
      position: fixed;
      left: 50%; top: 50%;
      transform: translate(-50%, 60px);
      background: rgba(10,30,18,0.97);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 16px;
      padding: 28px 40px;
      z-index: 9999;
      font-family: Fredoka, system-ui, sans-serif;
      color: #f5f5f5;
      min-width: 320px;
    `;
    overlay.innerHTML = `
      <div style="font-size:26px;font-weight:700;margin-bottom:20px;color:#ffd54f">音量設定</div>
      <div style="margin-bottom:16px">
        <div style="font-size:20px;margin-bottom:6px">BGM</div>
        <input id="vol-bgm" type="range" min="0" max="100"
          value="${Math.round(SoundSettings.bgmVolume() * 100)}"
          style="width:100%;accent-color:#64b5f6">
      </div>
      <div>
        <div style="font-size:20px;margin-bottom:6px">SE</div>
        <input id="vol-se" type="range" min="0" max="100"
          value="${Math.round(SoundSettings.seVolume() * 100)}"
          style="width:100%;accent-color:#f06292">
      </div>
    `;
    document.body.appendChild(overlay);
    this.volumeOverlay = overlay;

    overlay.querySelector<HTMLInputElement>('#vol-bgm')!.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      SoundSettings.setBgm(v);
      (this.bgm as Phaser.Sound.WebAudioSound).setVolume?.(v);
    });

    overlay.querySelector<HTMLInputElement>('#vol-se')!.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      SoundSettings.setSe(v);
    });
  }

  private removeVolumeOverlay(): void {
    if (this.volumeOverlay) {
      this.volumeOverlay.remove();
      this.volumeOverlay = null;
    }
  }

  private onInput(lane: LaneKey): void {
    if (this.isPaused) return;
    const bottom = this.stack.peekBottom();
    if (bottom === null) return;

    // Key cap press animation (always)
    const cap = this.keyCaps[lane];
    if (cap) {
      this.tweens.add({
        targets: cap,
        scale: 0.83,
        duration: 55,
        yoyo: true,
        ease: 'Quad.easeInOut',
      });
    }

    if (bottom === lane) {
      const pos = this.stack.getBottomPosition();
      this.stack.consumeBottom();
      this.scoreManager.success();
      this.sound.play('se-hit', { volume: SoundSettings.seVolume() });

      const combo = this.scoreManager.combo;

      if (pos) {
        this.emitters[lane]?.emitParticleAt(pos.x, pos.y, 14);
        this.spawnFloatText(pos.x, pos.y - 20, combo);
      }

      // Score pop
      this.tweens.add({
        targets: this.scoreText,
        scale: 1.22,
        duration: 80,
        yoyo: true,
        ease: 'Back.easeOut',
      });

      // Combo text pulse every 5
      if (combo >= 5 && combo % 5 === 0) {
        this.tweens.add({
          targets: this.comboText,
          scale: 1.6,
          duration: 130,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }

      // Milestone banner at 10/25/50
      const milestone = this.checkMilestone(combo);
      if (milestone) {
        this.showMilestone(milestone.label, milestone.color);
      }
    } else {
      const prevCombo = this.scoreManager.combo;
      this.scoreManager.fail();
      this.cameras.main.shake(160, 0.011);
      this.cameras.main.flash(80, 255, 80, 80);

      if (prevCombo >= 2) {
        this.spawnComboBreak(prevCombo);
      }
    }

    this.refreshScoreUi();
  }

  private spawnFloatText(x: number, y: number, combo: number): void {
    const isBonus = combo === 10 || combo === 25 || combo === 50;
    const label = isBonus ? '+6' : '+1';
    const color = isBonus ? COLORS.textAccent : '#ffffff';

    const t = this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: isBonus ? '52px' : '44px',
        fontStyle: 'bold',
        color,
      })
      .setOrigin(0.5)
      .setDepth(15);

    if (isBonus) {
      t.setShadow(0, 0, '#ffd54f', 12, false, true);
    }

    this.tweens.add({
      targets: t,
      y: y - 95,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private spawnComboBreak(prevCombo: number): void {
    const cx = VIEWPORT.width / 2;
    const t = this.add
      .text(cx, 165, `x${prevCombo}  BREAK`, {
        fontFamily: FONT,
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#ff5252',
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setScale(1.5)
      .setAlpha(0);

    this.tweens.add({
      targets: t,
      scale: 1,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: t,
          alpha: 0,
          y: 148,
          delay: 480,
          duration: 320,
          ease: 'Quad.easeIn',
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  private checkMilestone(combo: number): { label: string; color: string } | null {
    if (combo === 10) return { label: 'GREAT!', color: toHex(COLORS.lane[2]) };
    if (combo === 25) return { label: 'AWESOME!', color: toHex(COLORS.lane[3]) };
    if (combo === 50) return { label: 'PERFECT!', color: COLORS.textAccent };
    return null;
  }

  private showMilestone(label: string, color: string): void {
    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2 - 120;

    const t = this.add
      .text(cx, cy, label, {
        fontFamily: FONT,
        fontSize: '88px',
        fontStyle: 'bold',
        color,
      })
      .setOrigin(0.5)
      .setDepth(15)
      .setScale(1.9)
      .setAlpha(0)
      .setShadow(0, 0, color, 24, false, true);

    this.tweens.add({
      targets: t,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: t,
          alpha: 0,
          scale: 0.82,
          delay: 520,
          duration: 330,
          ease: 'Quad.easeIn',
          onComplete: () => t.destroy(),
        });
      },
    });
  }

  private refreshScoreUi(): void {
    this.scoreText.setText(`SCORE ${this.scoreManager.score}`);
    if (this.scoreManager.combo >= 2) {
      this.comboText.setText(`COMBO x${this.scoreManager.combo}`);
    } else {
      this.comboText.setText('');
    }
  }

  override update(_time: number, _delta: number): void {
    if (this.sessionTimer) {
      const remain = Math.max(0, this.sessionTimer.getRemaining());
      const secs = Math.ceil(remain / 1000);
      this.timerText.setText(`${secs}`);

      if (secs <= 10) {
        this.timerText.setColor('#ff5252');
        if (secs !== this.lastTimerSecs) {
          this.tweens.add({
            targets: this.timerText,
            scale: 1.35,
            duration: 130,
            yoyo: true,
            ease: 'Back.easeOut',
          });
        }
      }

      this.lastTimerSecs = secs;
    }

    if (this.isPaused) return;
    this.stack.tickRefill(DIFFICULTY.baseInterval);
  }

  private endSession(): void {
    this.removeVolumeOverlay();
    this.bgm.stop();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene', { score: this.scoreManager.score, mode: this.mode });
    });
  }

  shutdown(): void {
    this.removeVolumeOverlay();
  }
}
