import Phaser from 'phaser';
import { gameConfig } from '@/config/GameConfig';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { TitleScene } from '@/scenes/TitleScene';
import { GameScene } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';
import { RankingScene } from '@/scenes/RankingScene';
import { VsMenuScene } from '@/scenes/VsMenuScene';
import { VsLobbyScene } from '@/scenes/VsLobbyScene';
import { VsCountdownScene } from '@/scenes/VsCountdownScene';
import { VsResultScene } from '@/scenes/VsResultScene';

new Phaser.Game({
  ...gameConfig,
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    GameScene,
    GameOverScene,
    RankingScene,
    VsMenuScene,
    VsLobbyScene,
    VsCountdownScene,
    VsResultScene,
  ],
});
