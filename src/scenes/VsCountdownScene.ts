import Phaser from 'phaser';
import { COLORS, VIEWPORT, type GameMode } from '@/config/GameConfig';
import type { ParticipantInfo } from '@/services/VsService';

const FONT = 'Fredoka, system-ui, sans-serif';

export interface VsCountdownData {
  code: string;
  token: string;
  hostToken?: string;
  role: 'host' | 'guest';
  slot: number;
  seed: number;
  mode: GameMode;
  maxPlayers: number;
  startAt: number; // サーバ epoch ms
  serverOffset: number; // serverNow - localNow
  myNickname: string;
  participants: ParticipantInfo[];
}

export class VsCountdownScene extends Phaser.Scene {
  private params!: VsCountdownData;
  private targetLocalMs = 0;
  private countText!: Phaser.GameObjects.Text;
  private lastShown = -1;
  private launched = false;

  constructor() {
    super({ key: 'VsCountdownScene' });
  }

  create(data: VsCountdownData): void {
    this.params = data;
    // params に統一して以降は this.params を使う
    this.launched = false;
    this.lastShown = -1;
    // サーバ時刻基準の startAt をローカル時刻に変換
    this.targetLocalMs = data.startAt - data.serverOffset;

    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2;

    this.drawBackground();

    this.add
      .text(cx, 200, 'VS', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 18, false, true);

    this.add
      .text(cx, 280, `${data.participants.length}人のバトル`, {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#f5f5f5',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    // 参加者の名前を上部に並べる
    const names = data.participants.map((p) => p.nickname).join('  ·  ');
    this.add
      .text(cx, 340, names, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#aaaaaa',
        wordWrap: { width: VIEWPORT.width - 80 },
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.countText = this.add
      .text(cx, cy + 40, '', {
        fontFamily: FONT,
        fontSize: '220px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 28, true, true);

    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  override update(): void {
    if (this.launched) return;
    const remain = this.targetLocalMs - Date.now();

    if (remain <= 0) {
      this.launched = true;
      this.launchGame();
      return;
    }

    const secs = Math.ceil(remain / 1000);
    if (secs !== this.lastShown) {
      this.lastShown = secs;
      this.countText.setText(String(secs));
      this.countText.setScale(1.7).setAlpha(0.5);
      this.tweens.add({
        targets: this.countText,
        scale: 1,
        alpha: 1,
        duration: 360,
        ease: 'Back.easeOut',
      });
    }
  }

  private launchGame(): void {
    this.countText.setText('GO!').setColor('#64b5f6').setShadow(0, 0, '#64b5f6', 28, true, true);
    this.countText.setScale(1.5).setAlpha(0.6);
    this.tweens.add({
      targets: this.countText,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });

    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', {
        mode: this.params.mode,
        vs: {
          code: this.params.code,
          token: this.params.token,
          slot: this.params.slot,
          seed: this.params.seed,
          maxPlayers: this.params.maxPlayers,
          role: this.params.role,
          myNickname: this.params.myNickname,
          participants: this.params.participants,
        },
      });
    });
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }
}
