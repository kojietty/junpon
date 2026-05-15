import Phaser from 'phaser';
import { COLORS, STORAGE_KEYS, VIEWPORT } from '@/config/GameConfig';
import { SoundSettings } from '@/systems/SoundSettings';

export class TitleScene extends Phaser.Scene {
  private volumeOverlay: HTMLDivElement | null = null;
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = VIEWPORT.width / 2;

    this.add
      .text(cx, 260, 'JUNGLE TAP', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '120px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 380, 'S,D,J,Kで下のブロックから順番に消していこう。', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '36px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 440, '60秒で何点取れるか挑戦！', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '28px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const highScore = this.getHighScore();
    this.add
      .text(cx, 500, `HIGH SCORE: ${highScore}`, {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '32px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(cx, VIEWPORT.height - 380, 'TAP TO START', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const rankingText = this.add
      .text(cx, VIEWPORT.height - 240, 'RANKING', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#64b5f6', // COLORS.lane[2]
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const volumeText = this.add
      .text(cx, VIEWPORT.height - 120, '音量設定', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: COLORS.lane[1],
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startText.on('pointerdown', () => {
      this.removeVolumeOverlay();
      this.scene.start('GameScene');
    });
    rankingText.on('pointerdown', () => {
      this.removeVolumeOverlay();
      this.scene.start('RankingScene');
    });
    volumeText.on('pointerdown', () => this.toggleVolumeOverlay());

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.removeVolumeOverlay();
      this.scene.start('GameScene');
    });
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.removeVolumeOverlay();
      this.scene.start('GameScene');
    });

    this.events.on('shutdown', this.removeVolumeOverlay, this);
  }

  private getHighScore(): number {
    const raw = localStorage.getItem(STORAGE_KEYS.highScore);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  }

  private toggleVolumeOverlay(): void {
    if (this.volumeOverlay) {
      this.removeVolumeOverlay();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'vol-overlay-title';
    overlay.style.cssText = `
      position: fixed;
      left: 50%; top: 50%;
      transform: translate(-50%, -50%);
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
        <input id="vol-bgm-title" type="range" min="0" max="100"
          value="${Math.round(SoundSettings.bgmVolume() * 100)}"
          style="width:100%;accent-color:#64b5f6">
      </div>
      <div>
        <div style="font-size:20px;margin-bottom:6px">SE</div>
        <input id="vol-se-title" type="range" min="0" max="100"
          value="${Math.round(SoundSettings.seVolume() * 100)}"
          style="width:100%;accent-color:#f06292">
      </div>
      <div style="margin-top:24px;text-align:center;font-size:20px;color:#aaaaaa;cursor:pointer;" id="vol-close-btn">
        閉じる
      </div>
    `;
    document.body.appendChild(overlay);
    this.volumeOverlay = overlay;

    overlay.querySelector<HTMLInputElement>('#vol-bgm-title')!.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      SoundSettings.setBgm(v);
    });

    overlay.querySelector<HTMLInputElement>('#vol-se-title')!.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value) / 100;
      SoundSettings.setSe(v);
    });

    overlay.querySelector<HTMLDivElement>('#vol-close-btn')!.addEventListener('click', () => {
      this.removeVolumeOverlay();
    });
  }

  private removeVolumeOverlay(): void {
    if (this.volumeOverlay) {
      this.volumeOverlay.remove();
      this.volumeOverlay = null;
    }
  }
}
