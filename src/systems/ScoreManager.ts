export class ScoreManager {
  private _score = 0;
  private _combo = 0;

  get score(): number {
    return this._score;
  }

  get combo(): number {
    return this._combo;
  }

  success(): void {
    this._combo += 1;
    this._score += 1 + this.bonusFor(this._combo);
  }

  fail(): void {
    this._combo = 0;
    this._score = Math.max(0, this._score - 1);
  }

  /** Bonus on combo milestones: +5 at 10, 25, 50. */
  private bonusFor(combo: number): number {
    if (combo === 10 || combo === 25 || combo === 50) return 5;
    return 0;
  }
}
