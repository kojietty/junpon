import Phaser from 'phaser';

export const VIEWPORT = {
  width: 720,
  height: 1280,
} as const;

export type LaneKey = 0 | 1 | 2 | 3;
export type GameMode = 2 | 4;

export const MODES = {
  2: { count: 2, keys: ['D', 'J'] as const, colorIdx: [1, 2] as const },
  4: { count: 4, keys: ['S', 'D', 'J', 'K'] as const, colorIdx: [0, 1, 2, 3] as const },
} as const;

export const DEFAULT_MODE: GameMode = 4;

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
  stackVisibleCount: 6,
} as const;

export const SESSION_DURATION_MS = 60_000;

export const VS = {
  pollIntervalMs: 3_000,
  countdownOffsetMs: 5_000,
  roomTtlMs: 10 * 60 * 1000,
  resultTimeoutMs: 120_000,
  maxPlayers: 10,
  minPlayers: 2,
  codeLength: 6,
  codeChars: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
} as const;

export const STORAGE_KEYS = {
  highScore: (mode: GameMode) => `jungle-tap:highscore:${mode}key`,
  legacyHighScore: 'jungle-tap:highscore',
  lastMode: 'jungle-tap:last-mode',
} as const;

export function parseMode(raw: unknown): GameMode | null {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
  return n === 2 || n === 4 ? n : null;
}

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
