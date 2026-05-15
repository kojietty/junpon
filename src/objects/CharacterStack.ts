import Phaser from 'phaser';
import { DIFFICULTY, type LaneKey } from '@/config/GameConfig';
import { Character } from '@/objects/Character';

interface StackOptions {
  x: number;
  bottomY: number;
  visibleCount: number;
  cellHeight?: number;
}

const DEFAULT_CELL_HEIGHT = 130;

export class CharacterStack {
  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly bottomY: number;
  private readonly visibleCount: number;
  private readonly cellHeight: number;
  private characters: Character[] = [];
  private lastRefillAt = 0;

  constructor(scene: Phaser.Scene, options: StackOptions) {
    this.scene = scene;
    this.x = options.x;
    this.bottomY = options.bottomY;
    this.visibleCount = options.visibleCount;
    this.cellHeight = options.cellHeight ?? DEFAULT_CELL_HEIGHT;
  }

  fillInitial(): void {
    for (let i = 0; i < this.visibleCount; i += 1) {
      this.spawnAtTop();
    }
    this.layout(true);
  }

  peekBottom(): LaneKey | null {
    const bottom = this.characters[0];
    return bottom ? bottom.lane : null;
  }

  getBottomPosition(): { x: number; y: number } | null {
    const bottom = this.characters[0];
    return bottom ? { x: bottom.x, y: bottom.y } : null;
  }

  consumeBottom(): void {
    const bottom = this.characters.shift();
    if (!bottom) return;
    this.scene.tweens.add({
      targets: bottom,
      alpha: 0,
      scale: 1.4,
      duration: 140,
      onComplete: () => bottom.destroy(),
    });
    this.spawnAtTop();
    this.layout(false);
  }

  /**
   * Auto top-up so the visible stack stays full. Acts as a soft tempo signal:
   * shorter `interval` ⇒ visuals refresh faster ⇒ feels harder.
   */
  tickRefill(interval: number): void {
    const now = this.scene.time.now;
    if (now - this.lastRefillAt < interval) return;
    this.lastRefillAt = now;
    if (this.characters.length < this.visibleCount) {
      this.spawnAtTop();
      this.layout(false);
    }
  }

  private spawnAtTop(): void {
    const lane = Math.floor(Math.random() * DIFFICULTY.laneCount) as LaneKey;
    const topY = this.bottomY - this.cellHeight * this.visibleCount;
    const character = new Character(this.scene, this.x, topY - this.cellHeight, lane);
    this.characters.push(character);
  }

  private layout(instant: boolean): void {
    this.characters.forEach((character, index) => {
      const targetY = this.bottomY - index * this.cellHeight;
      if (instant) {
        character.y = targetY;
      } else {
        this.scene.tweens.add({
          targets: character,
          y: targetY,
          duration: 110,
          ease: 'Quad.easeOut',
        });
      }
    });
  }
}
