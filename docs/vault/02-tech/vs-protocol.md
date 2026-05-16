---
title: VS プロトコル
tags: [tech]
---

# VS プロトコル — Workers + D1 ベース API 仕様

[[../01-game-design/vs-mode|VS モード]] のクライアント / サーバ通信仕様。

## 設計原則

- **ステートレス Worker + D1**: Durable Objects 不使用 (無料枠厳守)
- **プレイ中は通信ゼロ**: ロビーと結果合流のみ
- **クライアントポーリング**: ロビー / 結果待ちで 3 秒間隔
- **無料枠試算**: 1 ルーム 10 人 ≈ 160 req → 100k req/日で **625 ルーム/日 = 6,250 人/日**

## D1 スキーマ

```sql
CREATE TABLE rooms (
  code         TEXT PRIMARY KEY,      -- 6桁、紛らわしい文字を除いた英数
  mode         INTEGER NOT NULL,      -- 2 or 4
  seed         INTEGER NOT NULL,      -- 32bit unsigned (PRNG 種)
  max_players  INTEGER NOT NULL,      -- 2-10
  host_token   TEXT NOT NULL,         -- start 権限
  host_device  TEXT NOT NULL,
  start_at     INTEGER,               -- サーバ epoch ms (NULL = まだ START 前)
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL       -- created_at + 10 分
);
CREATE INDEX idx_rooms_expires ON rooms(expires_at);

CREATE TABLE room_participants (
  code        TEXT NOT NULL,
  slot        INTEGER NOT NULL,       -- 1 = host
  token       TEXT NOT NULL,          -- 参加者個別の認可トークン
  device      TEXT NOT NULL,
  nickname    TEXT NOT NULL,
  score       INTEGER,                -- NULL = 未送信
  plays       INTEGER,                -- 入力回数 (不正対策)
  joined_at   INTEGER NOT NULL,
  PRIMARY KEY (code, slot)
);
CREATE INDEX idx_participants_code ON room_participants(code);
CREATE UNIQUE INDEX idx_participants_token ON room_participants(token);
```

TTL: 各 API ハンドラ先頭で確率 1/20 で `DELETE FROM rooms WHERE expires_at < now` を `batch()` で実行 (子テーブルも別 statement で削除)。

## ルームコード

- 6 桁、文字集合 `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (28 文字、`0OIL1` 除外)
- 28^6 ≈ 4.8 億通り → 同時 1000 ルームでも衝突確率 0.0002%
- INSERT 衝突時は worker 内で最大 5 回リトライ
- クライアント表示は 3-3 区切り (`ABC-XYZ`)、API には区切りなしで送る

## エンドポイント一覧

### `POST /api/rooms` — ルーム作成

```json
// req
{ "mode": 4, "maxPlayers": 4, "nickname": "alice", "deviceId": "uuid" }
// res 201
{ "code": "ABC123", "hostToken": "uuid", "seed": 1234567890, "slot": 1, "maxPlayers": 4, "mode": 4 }
```

- レート制限: 同一 device_id で 10 秒以内の作成は 429

### `POST /api/rooms/:code/join` — 参加

```json
// req
{ "nickname": "bob", "deviceId": "uuid" }
// res 200
{ "token": "uuid", "slot": 2, "seed": 1234567890, "mode": 4, "maxPlayers": 4, "hostNickname": "alice" }
```

- 404 ルームなし / 410 期限切れ / 409 開始済み or 満員 or 重複参加
- レート制限: 同一 device_id で 3 秒以内の join は 429

### `POST /api/rooms/:code/start` — ホスト開始

```json
// req
{ "hostToken": "uuid" }
// res 200
{ "startAt": 1715000000000, "serverNow": 1714999995000 }
```

- 403 hostToken 不一致 / 400 人数 < 2 / 409 既に START 済み
- `startAt = now + 5000` を書き込み

### `GET /api/rooms/:code` — ステータス取得 (ポーリング用)

```json
// res 200
{
  "status": "waiting",      // waiting | starting | playing | finished | expired
  "mode": 4,
  "seed": 1234567890,
  "maxPlayers": 4,
  "startAt": 1715000000000, // null も有り
  "participants": [
    { "slot": 1, "nickname": "alice", "score": null, "dnf": false },
    { "slot": 2, "nickname": "bob",   "score": 120,  "dnf": false }
  ],
  "serverNow": 1715000123456
}
```

- status は GET ハンドラ内で動的計算 (rooms.start_at と participants.score の状況から)
- `start_at + 120s` を過ぎても未送信が残っていれば dnf=true + score=0 で返す
- レート制限なし

### `POST /api/rooms/:code/score` — スコア送信

```json
// req
{ "token": "uuid", "score": 42, "plays": 80 }
// res 200
"ok"
```

- 400 score 範囲外 (0-500) / plays 範囲外 (0-600) / 受付窓外 / 二重送信
- 403 token 不一致

## status 遷移

GET ハンドラ内の計算ルール:

| 条件 | status |
|---|---|
| `expires_at < now` | expired |
| `start_at == NULL` | waiting |
| `now < start_at` | starting |
| `start_at <= now` かつ 未送信あり | playing |
| 全員 score NOT NULL | finished |

## 時刻同期

各レスポンスに `serverNow` を含める → クライアントは `offset = serverNow - localNow` を計算 → ローカル時刻の `targetTime = startAt - offset` まで sleep。

ネットワーク往復 / クロックずれで ±500ms 程度の誤差は許容範囲 (ノーツ決定論なので体感問題なし)。

## ポーリング戦略

- ロビー待機 / 結果待機ともに **3 秒間隔**
- プレイ中 (GameScene) は完全に通信なし
- 結果待機は 120 秒で打ち切り (DNF 集計)

## 不正対策

- score: integer, 0 ≤ score ≤ 500
- plays: integer, 0 ≤ plays ≤ 600
- 受付窓: `start_at + 55_000 < now < start_at + 120_000`
- token 認可 (per-participant)
- 二重送信は UPDATE 失敗で 400
- ルームコード総当たり: 28^6 通り + レート制限で実用上不可能

## 関連

- [[../01-game-design/vs-mode|VS モード仕様]]
- [[architecture|アーキテクチャ全体図]]
- [[stack|採用スタック]]
- [[../04-logs/2026-05-16|2026-05-16 設計判断]]
