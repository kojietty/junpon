import Phaser from 'phaser';
import { MODES, type GameMode, type LaneKey } from '@/config/GameConfig';

export class InputController {
  constructor(scene: Phaser.Scene, onInput: (lane: LaneKey) => void, mode: GameMode) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) return;
    MODES[mode].keys.forEach((key, idx) => {
      keyboard.on(`keydown-${key}`, () => onInput(idx as LaneKey));
    });
    // pointer 入力は Phase 2 (モバイル N 分割タップ) で追加予定
  }
}
