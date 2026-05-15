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

export class GameScene extends Phaser.Scene {
  private stack!: CharacterStack;
  private scoreManager!: ScoreManager;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private sessionTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.drawBackground();
    this.drawLaneZones();

    this.stack = new CharacterStack(this, {
      x: VIEWPORT.width / 2,
      bottomY: VIEWPORT.height - 460,
      visibleCount: DIFFICULTY.stackVisibleCount,
    });
    this.stack.fillInitial();

    this.scoreManager = new ScoreManager();

    this.scoreText = this.add
      .text(VIEWPORT.width / 2, 80, 'SCORE 0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.comboText = this.add
      .text(VIEWPORT.width / 2, 150, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    this.timerText = this.add
      .text(VIEWPORT.width - 24, 24, '60', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        fontStyle: 'bold',
        color: COLORS.textPrimary,
      })
      .setOrigin(1, 0);

    this.sessionTimer = this.time.delayedCall(SESSION_DURATION_MS, () => this.endSession());

    new InputController(this, (lane) => this.onInput(lane));
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private drawLaneZones(): void {
    const zoneHeight = 360;
    const zoneY = VIEWPORT.height - zoneHeight;
    const laneWidth = VIEWPORT.width / LANES.count;

    for (let i = 0; i < LANES.count; i += 1) {
      const color = COLORS.lane[i];
      this.add
        .rectangle(i * laneWidth, zoneY, laneWidth, zoneHeight, color, 0.18)
        .setOrigin(0, 0)
        .setStrokeStyle(2, color, 0.6);
      this.add
        .text(i * laneWidth + laneWidth / 2, zoneY + zoneHeight / 2, LANES.keys[i], {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '120px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    }
  }

  private onInput(lane: LaneKey): void {
    const bottom = this.stack.peekBottom();
    if (bottom === null) return;

    if (bottom === lane) {
      this.stack.consumeBottom();
      this.scoreManager.success();
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
    this.stack.tickRefill(DIFFICULTY.baseInterval);
    const remain = Math.max(0, this.sessionTimer.getRemaining());
    this.timerText.setText(`${Math.ceil(remain / 1000)}`);
  }

  private endSession(): void {
    this.scene.start('GameOverScene', { score: this.scoreManager.score });
  }
}
