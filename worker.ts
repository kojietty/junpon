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
