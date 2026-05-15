export interface RankingEntry {
  nickname: string;
  score: number;
  created_at: number;
}

export class RankingService {
  private static readonly DEVICE_KEY = 'junpon:device-id';
  private static readonly NICKNAME_KEY = 'junpon:last-nickname';

  static getDeviceId(): string {
    let id = localStorage.getItem(this.DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(this.DEVICE_KEY, id);
    }
    return id;
  }

  static getLastNickname(): string {
    return localStorage.getItem(this.NICKNAME_KEY) ?? '';
  }

  static saveNickname(nickname: string): void {
    localStorage.setItem(this.NICKNAME_KEY, nickname);
  }

  static async fetchTop(): Promise<RankingEntry[]> {
    try {
      const res = await fetch('/api/scores');
      if (!res.ok) return [];
      const data = (await res.json()) as { scores: RankingEntry[] };
      return data.scores ?? [];
    } catch {
      return [];
    }
  }

  static async submit(nickname: string, score: number): Promise<void> {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, score, deviceId: this.getDeviceId() }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    this.saveNickname(nickname);
  }
}
