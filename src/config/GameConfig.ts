import Phaser from 'phaser';

export const VIEWPORT = {
  width: 720,
  height: 1280,
} as const;

export type LaneKey = 0 | 1 | 2 | 3;

export const LANES = {
  count: 4,
  keys: ['S', 'D', 'J', 'K'] as const,
} as const;

export const COLORS = {
  background: 0x0d2a18,
  jungleDark: 0x1f6f3a,
  jungleLight: 0x4caf50,
  lane: [0xffb74d, 0xf06292, 0x64b5f6, 0xba68c8] as const,
  textPrimary: '#f5f5f5',
  textAccent: '#ffd54f',
  miss: 0xff5252,
} as const;

export const DIFFICULTY = {
  baseInterval: 700,
  minInterval: 200,
  decayPerScore: 8,
  laneCount: 4,
  stackVisibleCount: 6,
} as const;

export const SESSION_DURATION_MS = 60_000;

export const STORAGE_KEYS = {
  highScore: 'jungle-tap:highscore',
} as const;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEWPORT.width,
    height: VIEWPORT.height,
  },
  input: {
    activePointers: 3,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};
