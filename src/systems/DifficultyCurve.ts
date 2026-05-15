import { DIFFICULTY } from '@/config/GameConfig';

export class DifficultyCurve {
  intervalForScore(score: number): number {
    const value = DIFFICULTY.baseInterval - DIFFICULTY.decayPerScore * score;
    return Math.max(DIFFICULTY.minInterval, value);
  }
}
