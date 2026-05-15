import Phaser from 'phaser';
import { gameConfig } from '@/config/GameConfig';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { TitleScene } from '@/scenes/TitleScene';
import { GameScene } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';

new Phaser.Game({
  ...gameConfig,
  scene: [BootScene, PreloadScene, TitleScene, GameScene, GameOverScene],
});
