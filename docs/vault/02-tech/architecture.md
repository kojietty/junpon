---
title: アーキテクチャ
tags: [tech]
---

# アーキテクチャ

## Scene 構成

```
BootScene → PreloadScene → TitleScene ⇄ GameScene → GameOverScene
                                ↕  ↘         ↑           │
                                ↕    └── VsCountdownScene ←  VsLobbyScene ← VsMenuScene
                                ↕                       (vs フラグで GameScene 経由 VsResultScene)
                            RankingScene                └───────────┘ (リトライ)
```

| Scene | 役割 |
|-------|------|
| `BootScene` | ローダ初期化、レガシー localStorage 移行 |
| `PreloadScene` | 画像・音声の事前読込・進捗バー表示 |
| `TitleScene` | タイトル表示・**モード選択 (2KEY/4KEY/VS)** 待機 |
| `GameScene` | ゲーム本編（[[../01-game-design/mechanics]]、`mode` と任意の `vs` を受け取る） |
| `GameOverScene` | ソロ時のスコア・ハイスコア表示・リトライ・ランキング登録 |
| `RankingScene` | 2KEY/4KEY タブ切替式のサーバランキング表示 |
| `VsMenuScene` | VS の入口。CREATE / JOIN |
| `VsLobbyScene` | host: コード表示・START / guest: 参加・ホスト待ち |
| `VsCountdownScene` | サーバ `startAt - offset` まで sleep → 3-2-1-GO |
| `VsResultScene` | 結果ポーリング・順位表・WIN/DRAW/N位 |

## モード抽象化

```ts
type GameMode = 2 | 4;
const MODES = {
  2: { count: 2, keys: ['D','J'], colorIdx: [1, 2] },
  4: { count: 4, keys: ['S','D','J','K'], colorIdx: [0,1,2,3] },
}
```

`COLORS.lane` は 4 色配列を維持し、各モードが `colorIdx` で参照する。`LaneKey = 0|1|2|3` は据え置きで、2 キー時は 0|1 サブセットのみ使用。

## オブジェクト

- `Character`: `lane: LaneKey` と `mode: GameMode` を受け取り、`MODES[mode].colorIdx[lane]` / `keys[lane]` で表示
- `CharacterStack`: ノーツの縦並びを保持。コンストラクタで `mode` を受け取り `MODES[mode].count` 範囲で抽選

## システム

- `InputController`: コンストラクタで `mode` を受け取り、`MODES[mode].keys` を keydown 登録 (pointer は Phase 2)
- `ScoreManager`: スコア・コンボ。`success()` / `fail()` (床 0)
- `DifficultyCurve`: スコア → `interval` 計算 (MVP では未使用、Phase 2 で復活)

## データフロー

```
TitleScene (mode 選択) → GameScene.start({ mode })
keydown(MODES[mode].keys[i]) → InputController → GameScene.onInput(lane=i)
  → CharacterStack.peekBottom() と比較
    → 一致: stack.consumeBottom() + ScoreManager.success()
    → 不一致: ScoreManager.fail()

60秒タイマー満了 → GameOverScene.start({ score, mode })
  → 名前送信 → RankingService.submit(nickname, score, mode)
  → RankingScene.start({ myScore, myNickname, initialMode: mode })
```

## 永続化キー

| キー | 用途 |
|------|------|
| `jungle-tap:highscore:2key` | 2キーモードのハイスコア |
| `jungle-tap:highscore:4key` | 4キーモードのハイスコア |
| `jungle-tap:last-mode` | 直前にプレイしたモード（タイトル ENTER ショートカット、Ranking 初期タブ） |
| `junpon:device-id` | サーバランキング送信用 UUID（モード非依存） |
| `junpon:last-nickname` | 直近送信時のニックネーム（モード非依存） |
| ~~`jungle-tap:highscore`~~ | 旧キー。`BootScene` で `:4key` に移行後削除 |

## バックエンド (Cloudflare D1)

`scores` テーブル schema:
```sql
nickname TEXT, score INTEGER, mode INTEGER, device_id TEXT, created_at INTEGER
INDEX idx_scores_mode_score (mode, score DESC)
```

- GET `/api/scores?mode=2|4` → `WHERE mode=? ORDER BY score DESC LIMIT 50`
- POST `/api/scores` → body に `mode` 必須、`device_id` 単位で 30 秒のレート制限（モード横断グローバル）
- migrations: `migrations/NNNN_*.sql`、`wrangler d1 execute jampondb --local|--remote --file=...` で適用

### VS 用テーブル (`rooms` / `room_participants`)

```sql
rooms (code PK, mode, seed, max_players, host_token, host_device, start_at, created_at, expires_at)
room_participants (code, slot, token, device, nickname, score, plays, joined_at, PRIMARY KEY (code, slot))
```

詳細は [[vs-protocol]] を参照。ライフサイクルが scores と全く違う (append-only vs 数分 TTL) ため別テーブル。lazy GC は確率 1/20 で `DELETE FROM rooms WHERE expires_at < now` を `batch()` 実行。

### VS API (worker.ts)

- `POST /api/rooms` ルーム作成 / `POST /api/rooms/:code/join` 参加 / `POST /api/rooms/:code/start` ホスト開始
- `GET /api/rooms/:code` 状態取得 (ポーリング用、status を動的計算) / `POST /api/rooms/:code/score` スコア送信
- 詳細は [[vs-protocol]]

## VS の決定論ノーツ

`src/systems/SeededRng.ts` の `mulberry32(seed)` を `CharacterStack` の `rng?: () => number` オプションに注入。

- ソロ時は省略 → `Math.random` フォールバック (後方互換)
- VS 時はサーバ生成の 32bit seed を全端末で共有 → 全員同一の lane 列
- `tickRefill` は時刻ベースで rng を呼ばないため、フレームレート / 操作タイミング差に依存しない

## チューニング表

| パラメータ | 値 | メモ |
|------------|-----|------|
| 解像度 | 720 x 1280 (FIT) | 縦長想定 |
| `baseInterval` | 700ms | MVP は固定 ([[../01-game-design/difficulty]]) |
| `MODES[2].count` | 2 | D/J |
| `MODES[4].count` | 4 | S/D/J/K |
| `stackVisibleCount` | 6 | 画面上のノーツ数 |
| `SESSION_DURATION_MS` | 60000 | 1 セッション長 |
| `VS.pollIntervalMs` | 3000 | ロビー / 結果ポーリング間隔 |
| `VS.countdownOffsetMs` | 5000 | START 押下から実プレイ開始までの余裕 |
| `VS.roomTtlMs` | 600000 | ルーム自動失効 (10 分) |
| `VS.resultTimeoutMs` | 120000 | 全員スコア揃わなくても DNF で打ち切るまで |
| `VS.maxPlayers` | 10 | ホストが選べる上限 |

## 関連

- [[stack|採用スタック]]
- [[conventions|コーディング規約]]
- [[../04-logs/2026-05-15|2026-05-15 転向ログ]]
