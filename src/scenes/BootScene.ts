import Phaser from 'phaser';
import { STORAGE_KEYS } from '@/config/GameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.migrateLegacyHighScore();
    this.scene.start('PreloadScene');
  }

  // 旧フォーマット 'jungle-tap:highscore' は 4 キーで取得した値なので :4key に移管する。
  private migrateLegacyHighScore(): void {
    const legacy = localStorage.getItem(STORAGE_KEYS.legacyHighScore);
    if (legacy === null) return;
    const target = STORAGE_KEYS.highScore(4);
    if (localStorage.getItem(target) === null) {
      localStorage.setItem(target, legacy);
    }
    localStorage.removeItem(STORAGE_KEYS.legacyHighScore);
  }
}
