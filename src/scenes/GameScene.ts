import Phaser from 'phaser';
import {
  COLORS,
  DIFFICULTY,
  LANES,
  SESSION_DURATION_MS,
  VIEWPORT,
  type LaneKey,
} from '@/config/GameConfig';
import { CharacterStack } from '@/objects/CharacterStack';
import { InputController } from '@/systems/InputController';
import { ScoreManager } from '@/systems/ScoreManager';
import { SoundSettings } from '@/systems/SoundSettings';

const FONT = 'Fredoka, system-ui, sans-serif';

export class GameScene extends Phaser.Scene {
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
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.isPaused = false;
    this.drawBackground();
    this.drawLaneZones();
    this.createParticleEmitter();

    this.stack = new CharacterStack(this, {
      x: VIEWPORT.width / 2,
      bottomY: VIEWPORT.height - 300,
      visibleCount: DIFFICULTY.stackVisibleCount,
    });
    this.stack.fillInitial();

    this.scoreManager = new ScoreManager();

    this.scoreText = this.add
      .text(VIEWPORT.width / 2, 80, 'SCORE 0', {
        fontFamily: FONT,
        fontSize: '56px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.comboText = this.add
      .text(VIEWPORT.width / 2, 155, '', {
        fontFamily: FONT,
        fontSize: '40px',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.timerText = this.add
      .text(VIEWPORT.width - 28, 28, '60', {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(1, 0);

    // ESC hint
    this.add
      .text(28, 28, '≡ ESC', {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#ffffff',
        alpha: 0.5,
      } as Phaser.Types.GameObjects.Text.TextStyle)
      .setOrigin(0, 0);

    new InputController(this, (lane) => this.onInput(lane));

    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());

    this.createPauseMenu();

    this.startCountdown();
  }

  private startCountdown(): void {
    this.isCountingDown = true;
    this.isPaused = true;
    
    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2;
    const countText = this.add.text(cx, cy - 50, '3', {
      fontFamily: FONT,
      fontSize: '180px',
      fontStyle: 'bold',
      color: COLORS.textAccent,
    }).setOrigin(0.5).setDepth(100);

    let count = 3;
    const tick = () => {
      this.tweens.add({
        targets: countText,
        scale: { from: 1.5, to: 1 },
        alpha: { from: 0.3, to: 1 },
        duration: 300,
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
          tick();
          this.startGame();
        } else {
          countText.destroy();
        }
      }
    });
  }

  private startGame(): void {
    this.isCountingDown = false;
    this.isPaused = false;
    this.sessionTimer = this.time.delayedCall(SESSION_DURATION_MS, () => this.endSession());
    this.bgm = this.sound.add('bgm', { loop: true, volume: SoundSettings.bgmVolume() });
    this.bgm.play();
  }

  private createParticleEmitter(): void {
    const g = this.make.graphics({});
    g.fillStyle(0xffffff);
    g.fillCircle(5, 5, 5);
    g.generateTexture('particle-dot', 10, 10);
    g.destroy();

    this.emitter = this.add.particles(0, 0, 'particle-dot', {
      speed: { min: 120, max: 260 },
      scale: { start: 0.6, end: 0 },
      lifespan: 380,
      quantity: 10,
      emitting: false,
    });
    this.emitter.setDepth(10);
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
    const laneWidth = VIEWPORT.width / LANES.count;
    const capW = laneWidth - 16;
    const capH = 72;
    const capY = VIEWPORT.height - 52;

    for (let i = 0; i < LANES.count; i += 1) {
      const color = COLORS.lane[i];
      const cx = i * laneWidth + laneWidth / 2;

      // horizontal hit-line
      // this.add.rectangle(cx, VIEWPORT.height - capH - 10, laneWidth - 4, 4, color, 1);

      // key cap badge
      const capG = this.add.graphics();
      capG.fillStyle(color, 0.92);
      capG.fillRoundedRect(cx - capW / 2, capY - capH / 2, capW, capH, 14);
      capG.lineStyle(3, 0xffffff, 0.6);
      capG.strokeRoundedRect(cx - capW / 2, capY - capH / 2, capW, capH, 14);

      this.add
        .text(cx, capY, LANES.keys[i], {
          fontFamily: FONT,
          fontSize: '52px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    }
  }

  private createPauseMenu(): void {
    const cx = VIEWPORT.width / 2;
    const panelW = 560;
    const panelH = 520;
    const panelX = cx - panelW / 2;
    const panelY = 240;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.82);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
    bg.lineStyle(2, 0xffffff, 0.15);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    const title = this.add
      .text(cx, panelY + 52, 'PAUSE', {
        fontFamily: FONT,
        fontSize: '60px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    const btnRetry = this.makePauseBtn(cx, panelY + 160, 'やりなおす', COLORS.lane[1], () => {
      this.removeVolumeOverlay();
      this.bgm.stop();
      this.scene.start('GameScene');
    });

    const btnTitle = this.makePauseBtn(cx, panelY + 260, 'タイトルに戻る', 0x607d8b, () => {
      this.removeVolumeOverlay();
      this.bgm.stop();
      this.scene.start('TitleScene');
    });

    const btnVolume = this.makePauseBtn(cx, panelY + 360, '音量設定', COLORS.lane[2], () => {
      this.toggleVolumeOverlay();
    });

    const closeHint = this.add
      .text(cx, panelY + panelH - 36, 'ESC で閉じる', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#aaaaaa',
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
    hitArea.on('pointerover', () => bg.setAlpha(0.7));
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

    if (bottom === lane) {
      const pos = this.stack.getBottomPosition();
      this.stack.consumeBottom();
      this.scoreManager.success();
      this.sound.play('se-hit', { volume: SoundSettings.seVolume() });
      if (pos) {
        this.emitter.emitParticleAt(pos.x, pos.y, 10);
      }
      if (this.scoreManager.combo >= 5 && this.scoreManager.combo % 5 === 0) {
        this.tweens.add({
          targets: this.comboText,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 100,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
    } else {
      this.scoreManager.fail();
      this.cameras.main.flash(120, 255, 80, 80);
    }
    this.refreshScoreUi();
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
      }
    }

    if (this.isPaused) return;
    this.stack.tickRefill(DIFFICULTY.baseInterval);
  }

  private endSession(): void {
    this.removeVolumeOverlay();
    this.bgm.stop();
    this.scene.start('GameOverScene', { score: this.scoreManager.score });
  }

  shutdown(): void {
    this.removeVolumeOverlay();
  }
}
