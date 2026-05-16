/* eslint-disable */
// Cloudflare Worker entry point — compiled by wrangler, not Vite

interface Env {
  DB: D1Database;
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

interface ScoreRow {
  nickname: string;
  score: number;
  mode: number;
  created_at: number;
}

interface PostBody {
  nickname?: unknown;
  score?: unknown;
  mode?: unknown;
  deviceId?: unknown;
}

interface RoomRow {
  code: string;
  mode: number;
  seed: number;
  max_players: number;
  host_token: string;
  host_device: string;
  start_at: number | null;
  created_at: number;
  expires_at: number;
}

interface ParticipantRow {
  code: string;
  slot: number;
  token: string;
  device: string;
  nickname: string;
  score: number | null;
  plays: number | null;
  joined_at: number;
}

// ルームコード文字種: 0/O/I/L/1 を除いた 28 文字
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const ROOM_TTL_MS = 10 * 60 * 1000;
const COUNTDOWN_OFFSET_MS = 5_000;
const PLAY_WINDOW_MIN_MS = 55_000;
const PLAY_WINDOW_MAX_MS = 120_000;

function parseModeParam(raw: string | null): 2 | 4 | null {
  if (raw === null) return 4; // 旧 URL のフォールバックは 4 キー
  const n = Number.parseInt(raw, 10);
  return n === 2 || n === 4 ? n : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/scores') {
      if (request.method === 'GET') return handleGet(url, env.DB);
      if (request.method === 'POST') return handlePost(request, env.DB);
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (url.pathname.startsWith('/api/rooms')) {
      return handleRooms(request, url, env.DB);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleGet(url: URL, db: D1Database): Promise<Response> {
  const mode = parseModeParam(url.searchParams.get('mode'));
  if (mode === null) return new Response('invalid mode', { status: 400 });

  const { results } = await db
    .prepare(
      'SELECT nickname, score, mode, created_at FROM scores WHERE mode = ?1 ORDER BY score DESC LIMIT 50',
    )
    .bind(mode)
    .all<ScoreRow>();
  return Response.json({ scores: results ?? [] });
}

async function handlePost(request: Request, db: D1Database): Promise<Response> {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const { nickname, score, mode, deviceId } = body;

  if (typeof nickname !== 'string' || nickname.trim().length < 1 || nickname.length > 12) {
    return new Response('invalid nickname', { status: 400 });
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 9999) {
    return new Response('invalid score', { status: 400 });
  }
  if (mode !== 2 && mode !== 4) {
    return new Response('invalid mode', { status: 400 });
  }

  const deviceStr = typeof deviceId === 'string' ? deviceId : '';
  const now = Date.now();

  // モード横断のグローバル制限 — 30秒以内の連続送信を弾く（スパム対策）
  if (deviceStr) {
    const recent = await db
      .prepare(
        'SELECT created_at FROM scores WHERE device_id = ?1 ORDER BY created_at DESC LIMIT 1',
      )
      .bind(deviceStr)
      .first<{ created_at: number }>();
    if (recent && now - recent.created_at < 30_000) {
      return new Response('rate limited', { status: 429 });
    }
  }

  await db
    .prepare(
      'INSERT INTO scores (nickname, score, mode, device_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)',
    )
    .bind(nickname.trim(), score, mode, deviceStr, now)
    .run();

  return new Response('ok', { status: 201 });
}

// ─── VS Rooms ────────────────────────────────────────────────────────────────

async function handleRooms(request: Request, url: URL, db: D1Database): Promise<Response> {
  // Lazy GC: 確率 1/20 で TTL 失効ルームを掃除
  if (Math.random() < 0.05) {
    await sweepExpiredRooms(db, Date.now());
  }

  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'rooms', ...]

  if (parts.length === 2) {
    // /api/rooms
    if (request.method === 'POST') return handleCreateRoom(request, db);
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (parts.length === 3) {
    // /api/rooms/:code
    const code = normalizeCode(parts[2]);
    if (!code) return new Response('invalid code', { status: 400 });
    if (request.method === 'GET') return handleGetRoom(code, db);
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (parts.length === 4) {
    // /api/rooms/:code/{join|start|score}
    const code = normalizeCode(parts[2]);
    if (!code) return new Response('invalid code', { status: 400 });
    const action = parts[3];
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    if (action === 'join') return handleJoinRoom(request, code, db);
    if (action === 'start') return handleStartRoom(request, code, db);
    if (action === 'score') return handleSubmitVsScore(request, code, db);
    return new Response('Not Found', { status: 404 });
  }

  return new Response('Not Found', { status: 404 });
}

async function sweepExpiredRooms(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db
      .prepare(
        'DELETE FROM room_participants WHERE code IN (SELECT code FROM rooms WHERE expires_at < ?1)',
      )
      .bind(now),
    db.prepare('DELETE FROM rooms WHERE expires_at < ?1').bind(now),
  ]);
}

function normalizeCode(raw: string): string | null {
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper.length !== CODE_LENGTH) return null;
  for (const ch of upper) {
    if (!CODE_CHARS.includes(ch)) return null;
  }
  return upper;
}

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return out;
}

function generateSeed(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] >>> 0;
}

function validNickname(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length >= 1 && v.length <= 12;
}

async function handleCreateRoom(request: Request, db: D1Database): Promise<Response> {
  let body: {
    mode?: unknown;
    maxPlayers?: unknown;
    nickname?: unknown;
    deviceId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const { mode, maxPlayers, nickname, deviceId } = body;
  if (mode !== 2 && mode !== 4) return new Response('invalid mode', { status: 400 });
  if (
    typeof maxPlayers !== 'number' ||
    !Number.isInteger(maxPlayers) ||
    maxPlayers < 2 ||
    maxPlayers > 10
  ) {
    return new Response('invalid maxPlayers', { status: 400 });
  }
  if (!validNickname(nickname)) return new Response('invalid nickname', { status: 400 });
  if (typeof deviceId !== 'string' || !deviceId) {
    return new Response('invalid deviceId', { status: 400 });
  }

  const now = Date.now();

  // device 単位: 10 秒以内に同じ端末がルームを作っていたら拒否
  const recent = await db
    .prepare('SELECT created_at FROM rooms WHERE host_device = ?1 ORDER BY created_at DESC LIMIT 1')
    .bind(deviceId)
    .first<{ created_at: number }>();
  if (recent && now - recent.created_at < 10_000) {
    return new Response('rate limited', { status: 429 });
  }

  const hostToken = crypto.randomUUID();
  const seed = generateSeed();
  const nick = (nickname as string).trim();

  // ルームコードを衝突回避リトライしつつ INSERT
  let code: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode();
    try {
      await db
        .prepare(
          'INSERT INTO rooms (code, mode, seed, max_players, host_token, host_device, start_at, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8)',
        )
        .bind(candidate, mode, seed, maxPlayers, hostToken, deviceId, now, now + ROOM_TTL_MS)
        .run();
      code = candidate;
      break;
    } catch {
      // PRIMARY KEY collision → retry
    }
  }
  if (!code) return new Response('code collision', { status: 503 });

  await db
    .prepare(
      'INSERT INTO room_participants (code, slot, token, device, nickname, score, plays, joined_at) VALUES (?1, 1, ?2, ?3, ?4, NULL, NULL, ?5)',
    )
    .bind(code, hostToken, deviceId, nick, now)
    .run();

  return Response.json({ code, hostToken, seed, slot: 1, maxPlayers, mode }, { status: 201 });
}

async function handleJoinRoom(
  request: Request,
  code: string,
  db: D1Database,
): Promise<Response> {
  let body: { nickname?: unknown; deviceId?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const { nickname, deviceId } = body;
  if (!validNickname(nickname)) return new Response('invalid nickname', { status: 400 });
  if (typeof deviceId !== 'string' || !deviceId) {
    return new Response('invalid deviceId', { status: 400 });
  }

  const now = Date.now();

  const room = await db
    .prepare('SELECT * FROM rooms WHERE code = ?1')
    .bind(code)
    .first<RoomRow>();
  if (!room) return new Response('not found', { status: 404 });
  if (room.expires_at < now) return new Response('expired', { status: 410 });
  if (room.start_at !== null) return new Response('already started', { status: 409 });

  // device 単位: 3 秒以内の連続 join を抑制
  const recentJoin = await db
    .prepare(
      'SELECT joined_at FROM room_participants WHERE device = ?1 ORDER BY joined_at DESC LIMIT 1',
    )
    .bind(deviceId)
    .first<{ joined_at: number }>();
  if (recentJoin && now - recentJoin.joined_at < 3_000) {
    return new Response('rate limited', { status: 429 });
  }

  const { results: participants } = await db
    .prepare('SELECT * FROM room_participants WHERE code = ?1 ORDER BY slot ASC')
    .bind(code)
    .all<ParticipantRow>();
  const list = participants ?? [];

  if (list.some((p) => p.device === deviceId)) {
    return new Response('already joined', { status: 409 });
  }
  if (list.length >= room.max_players) {
    return new Response('room full', { status: 409 });
  }

  // 最小の空き slot を探す (1..maxPlayers)
  const used = new Set(list.map((p) => p.slot));
  let slot = -1;
  for (let s = 1; s <= room.max_players; s++) {
    if (!used.has(s)) {
      slot = s;
      break;
    }
  }
  if (slot < 0) return new Response('room full', { status: 409 });

  const token = crypto.randomUUID();
  const nick = (nickname as string).trim();

  await db
    .prepare(
      'INSERT INTO room_participants (code, slot, token, device, nickname, score, plays, joined_at) VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, ?6)',
    )
    .bind(code, slot, token, deviceId, nick, now)
    .run();

  const host = list.find((p) => p.slot === 1);
  return Response.json({
    token,
    slot,
    seed: room.seed,
    mode: room.mode,
    maxPlayers: room.max_players,
    hostNickname: host?.nickname ?? '',
  });
}

async function handleStartRoom(
  request: Request,
  code: string,
  db: D1Database,
): Promise<Response> {
  let body: { hostToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const { hostToken } = body;
  if (typeof hostToken !== 'string' || !hostToken) {
    return new Response('invalid hostToken', { status: 400 });
  }

  const now = Date.now();
  const room = await db
    .prepare('SELECT * FROM rooms WHERE code = ?1')
    .bind(code)
    .first<RoomRow>();
  if (!room) return new Response('not found', { status: 404 });
  if (room.expires_at < now) return new Response('expired', { status: 410 });
  if (room.host_token !== hostToken) return new Response('forbidden', { status: 403 });
  if (room.start_at !== null) return new Response('already started', { status: 409 });

  const countRow = await db
    .prepare('SELECT COUNT(*) AS c FROM room_participants WHERE code = ?1')
    .bind(code)
    .first<{ c: number }>();
  const count = countRow?.c ?? 0;
  if (count < 2) return new Response('need at least 2 players', { status: 400 });

  const startAt = now + COUNTDOWN_OFFSET_MS;
  await db
    .prepare('UPDATE rooms SET start_at = ?1 WHERE code = ?2')
    .bind(startAt, code)
    .run();

  return Response.json({ startAt, serverNow: now });
}

async function handleGetRoom(code: string, db: D1Database): Promise<Response> {
  const now = Date.now();
  const room = await db
    .prepare('SELECT * FROM rooms WHERE code = ?1')
    .bind(code)
    .first<RoomRow>();
  if (!room) return new Response('not found', { status: 404 });
  if (room.expires_at < now) {
    return Response.json({ status: 'expired', serverNow: now });
  }

  const { results: participants } = await db
    .prepare(
      'SELECT slot, nickname, score FROM room_participants WHERE code = ?1 ORDER BY slot ASC',
    )
    .bind(code)
    .all<{ slot: number; nickname: string; score: number | null }>();
  const list = participants ?? [];

  // dnf: プレイ終了枠を過ぎても未送信なら 0 点扱いで結果に出す
  const dnf =
    room.start_at !== null &&
    now > room.start_at + PLAY_WINDOW_MAX_MS &&
    list.some((p) => p.score === null);

  const cleaned = list.map((p) => {
    if (p.score === null && dnf) {
      return { slot: p.slot, nickname: p.nickname, score: 0, dnf: true };
    }
    return { slot: p.slot, nickname: p.nickname, score: p.score, dnf: false };
  });

  let status: 'waiting' | 'starting' | 'playing' | 'finished';
  if (room.start_at === null) {
    status = 'waiting';
  } else if (now < room.start_at) {
    status = 'starting';
  } else {
    const allSubmitted = cleaned.every((p) => p.score !== null);
    status = allSubmitted ? 'finished' : 'playing';
  }

  return Response.json({
    status,
    mode: room.mode,
    seed: room.seed,
    maxPlayers: room.max_players,
    startAt: room.start_at,
    participants: cleaned,
    serverNow: now,
  });
}

async function handleSubmitVsScore(
  request: Request,
  code: string,
  db: D1Database,
): Promise<Response> {
  let body: { token?: unknown; score?: unknown; plays?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const { token, score, plays } = body;
  if (typeof token !== 'string' || !token) {
    return new Response('invalid token', { status: 400 });
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 500) {
    return new Response('invalid score', { status: 400 });
  }
  if (typeof plays !== 'number' || !Number.isInteger(plays) || plays < 0 || plays > 600) {
    return new Response('invalid plays', { status: 400 });
  }

  const now = Date.now();

  const room = await db
    .prepare('SELECT * FROM rooms WHERE code = ?1')
    .bind(code)
    .first<RoomRow>();
  if (!room) return new Response('not found', { status: 404 });
  if (room.start_at === null) return new Response('not started', { status: 409 });
  if (now < room.start_at + PLAY_WINDOW_MIN_MS) {
    return new Response('too early', { status: 400 });
  }
  if (now > room.start_at + PLAY_WINDOW_MAX_MS) {
    return new Response('too late', { status: 400 });
  }

  const participant = await db
    .prepare('SELECT * FROM room_participants WHERE code = ?1 AND token = ?2')
    .bind(code, token)
    .first<ParticipantRow>();
  if (!participant) return new Response('forbidden', { status: 403 });
  if (participant.score !== null) {
    return new Response('already submitted', { status: 400 });
  }

  await db
    .prepare('UPDATE room_participants SET score = ?1, plays = ?2 WHERE code = ?3 AND token = ?4')
    .bind(score, plays, code, token)
    .run();

  return new Response('ok');
}
