import type { GameMode } from '@/config/GameConfig';
import { RankingService } from '@/services/RankingService';

export interface ParticipantInfo {
  slot: number;
  nickname: string;
  score: number | null;
  dnf: boolean;
}

export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'finished' | 'expired';

export interface RoomState {
  status: RoomStatus;
  mode: GameMode;
  seed: number;
  maxPlayers: number;
  startAt: number | null;
  participants: ParticipantInfo[];
  serverNow: number;
}

export interface CreateRoomResult {
  code: string;
  hostToken: string;
  seed: number;
  slot: number;
  maxPlayers: number;
  mode: GameMode;
}

export interface JoinRoomResult {
  token: string;
  slot: number;
  seed: number;
  mode: GameMode;
  maxPlayers: number;
  hostNickname: string;
}

export interface StartRoomResult {
  startAt: number;
  serverNow: number;
}

export class VsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'VsApiError';
  }
}

async function readError(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return res.statusText;
  }
}

async function ensureOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const text = await readError(res);
    throw new VsApiError(res.status, text || `${res.status}`);
  }
  return res;
}

export class VsService {
  static async createRoom(
    mode: GameMode,
    maxPlayers: number,
    nickname: string,
  ): Promise<CreateRoomResult> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        maxPlayers,
        nickname,
        deviceId: RankingService.getDeviceId(),
      }),
    });
    await ensureOk(res);
    return (await res.json()) as CreateRoomResult;
  }

  static async joinRoom(code: string, nickname: string): Promise<JoinRoomResult> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname,
        deviceId: RankingService.getDeviceId(),
      }),
    });
    await ensureOk(res);
    return (await res.json()) as JoinRoomResult;
  }

  static async getRoom(code: string): Promise<RoomState> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
    await ensureOk(res);
    return (await res.json()) as RoomState;
  }

  static async startRoom(code: string, hostToken: string): Promise<StartRoomResult> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken }),
    });
    await ensureOk(res);
    return (await res.json()) as StartRoomResult;
  }

  static async submitScore(
    code: string,
    token: string,
    score: number,
    plays: number,
  ): Promise<void> {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, score, plays }),
    });
    await ensureOk(res);
  }
}

export function formatRoomCode(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length === 6) return `${upper.slice(0, 3)}-${upper.slice(3)}`;
  return upper;
}

export function sanitizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
