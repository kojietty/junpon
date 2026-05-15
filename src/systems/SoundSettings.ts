export class SoundSettings {
  static readonly BGM_KEY = 'junpon:bgm-vol';
  static readonly SE_KEY = 'junpon:se-vol';

  static bgmVolume(): number {
    return (Number(localStorage.getItem(this.BGM_KEY)) || 50) / 100;
  }

  static seVolume(): number {
    return (Number(localStorage.getItem(this.SE_KEY)) || 80) / 100;
  }

  static setBgm(v: number): void {
    localStorage.setItem(this.BGM_KEY, String(Math.round(v * 100)));
  }

  static setSe(v: number): void {
    localStorage.setItem(this.SE_KEY, String(Math.round(v * 100)));
  }
}
