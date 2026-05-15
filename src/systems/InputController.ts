import Phaser from 'phaser';
import { LANES, type LaneKey } from '@/config/GameConfig';

export class InputController {
  constructor(scene: Phaser.Scene, onInput: (lane: LaneKey) => void) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) return;
    LANES.keys.forEach((key, idx) => {
      keyboard.on(`keydown-${key}`, () => onInput(idx as LaneKey));
    });
    // pointer 入力は Phase 2 (モバイル 4 分割タップ) で追加予定
  }
}
