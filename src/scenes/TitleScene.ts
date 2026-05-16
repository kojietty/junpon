import Phaser from 'phaser';
import { COLORS, LANES, STORAGE_KEYS, VIEWPORT } from '@/config/GameConfig';
import { SoundSettings } from '@/systems/SoundSettings';

const FONT = 'Fredoka, system-ui, sans-serif';

export class TitleScene extends Phaser.Scene {
  private volumeOverlay: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = VIEWPORT.width / 2;

    this.drawBackground();
    this.spawnAmbientParticles();
    this.buildUI(cx);
    this.setupInput();
    this.cameras.main.fadeIn(220, 0, 0, 0);

    this.events.on('shutdown', this.removeVolumeOverlay, this);
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private spawnAmbientParticles(): void {
    const g = this.make.graphics({});
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('title-spark', 8, 8);
    g.destroy();

    this.add.particles(0, 0, 'title-spark', {
      x: { min: 0, max: VIEWPORT.width },
      y: { min: 0, max: VIEWPORT.height },
      speedY: { min: -20, max: -55 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: { min: 4000, max: 7000 },
      frequency: 160,
      quantity: 1,
      tint: [COLORS.lane[0], COLORS.lane[1], COLORS.lane[2], COLORS.lane[3], 0xffffff],
    });
  }

  private buildUI(cx: number): void {
    const title = this.add
      .text(cx, 270, 'JAMPON', {
        fontFamily: FONT,
        fontSize: '112px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setShadow(0, 0, '#ffd54f', 20, false, true);

    this.tweens.add({ targets: title, alpha: 1, y: 280, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: title,
      y: 272,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 700,
    });

    this.buildKeyPreview(cx, 430);

    const desc = this.add
      .text(cx, 555, '60秒で何点取れるか挑戦！', {
        fontFamily: FONT,
        fontSize: '30px',
        color: COLORS.textPrimary,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const highScore = this.getHighScore();
    const hiText = this.add
      .text(cx, 615, `BEST  ${highScore}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setShadow(0, 0, '#ffd54f', 8, false, true);

    this.tweens.add({ targets: desc, alpha: 0.85, delay: 150, duration: 400 });
    this.tweens.add({ targets: hiText, alpha: 1, delay: 250, duration: 400 });

    const startBtn = this.makeButton(cx, VIEWPORT.height - 390, 'TAP TO START', COLORS.lane[1], () => {
      this.removeVolumeOverlay();
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    });
    startBtn.setAlpha(0).setScale(0.88);
    this.tweens.add({
      targets: startBtn,
      alpha: 1,
      scale: 1,
      delay: 380,
      duration: 380,
      ease: 'Back.easeOut',
    });
    // Subtle alpha pulse so it draws attention
    this.tweens.add({
      targets: startBtn,
      alpha: 0.72,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1000,
    });

    const rankingBtn = this.makeButton(cx, VIEWPORT.height - 258, 'RANKING', COLORS.lane[2], () => {
      this.removeVolumeOverlay();
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('RankingScene'));
    });
    rankingBtn.setAlpha(0).setScale(0.88);
    this.tweens.add({
      targets: rankingBtn,
      alpha: 1,
      scale: 1,
      delay: 490,
      duration: 380,
      ease: 'Back.easeOut',
    });

    const volumeText = this.add
      .text(cx, VIEWPORT.height - 118, '♪  音量設定', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: volumeText, alpha: 0.85, delay: 600, duration: 400 });

    volumeText.on('pointerover', () => volumeText.setAlpha(1).setColor('#f5f5f5'));
    volumeText.on('pointerout', () => volumeText.setAlpha(0.85).setColor('#888888'));
    volumeText.on('pointerdown', () => this.toggleVolumeOverlay());
  }

  private buildKeyPreview(cx: number, y: number): void {
    const w = 88;
    const h = 88;
    const gap = 108;
    const startX = cx - gap * 1.5;

    for (let i = 0; i < LANES.count; i++) {
      const x = startX + i * gap;
      const color = COLORS.lane[i];
      const g = this.add.graphics();
      g.fillStyle(color, 0.88);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
      g.lineStyle(3, 0xffffff, 0.4);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
      // Top shine
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(x - w / 2 + 5, y - h / 2 + 5, w - 10, 22, { tl: 10, tr: 10, bl: 0, br: 0 });

      this.add
        .text(x, y + 2, LANES.keys[i], {
          fontFamily: FONT,
          fontSize: '46px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    }
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 480;
    const h = 84;

    const bg = this.add.graphics();
    const drawBg = (alpha: number) => {
      bg.clear();
      bg.fillStyle(color, alpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(2, 0xffffff, 0.25);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.fillStyle(0xffffff, 0.12);
      bg.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, 18, { tl: 12, tr: 12, bl: 0, br: 0 });
    };
    drawBg(0.9);

    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y);
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    container.add([bg, text, hit]);

    hit.on('pointerover', () => {
      drawBg(1.0);
      this.tweens.add({ targets: container, scale: 1.06, duration: 130, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      drawBg(0.9);
      this.tweens.add({ targets: container, scale: 1.0, duration: 130 });
    });
    hit.on('pointerdown', onClick);

    return container;
  }

  private setupInput(): void {
    const goToGame = () => {
      this.removeVolumeOverlay();
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    };
    this.input.keyboard?.once('keydown-ENTER', goToGame);
    this.input.keyboard?.once('keydown-SPACE', goToGame);
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
