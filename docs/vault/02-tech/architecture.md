---
title: アーキテクチャ
tags: [tech]
---

# アーキテクチャ

## Scene 構成

```
BootScene → PreloadScene → TitleScene ⇄ GameScene → GameOverScene
                                  ↕            ↑           │
                              RankingScene     └───────────┘ (リトライ)
```

| Scene | 役割 |
|-------|------|
| `BootScene` | ローダ初期化、レガシー localStorage 移行 |
| `PreloadScene` | 画像・音声の事前読込・進捗バー表示 |
| `TitleScene` | タイトル表示・**モード選択 (2KEY/4KEY)** 待機 |
| `GameScene` | ゲーム本編（[[../01-game-design/mechanics]]、`mode` を受け取る） |
| `GameOverScene` | スコア・ハイスコア表示・リトライ・ランキング登録 |
| `RankingScene` | 2KEY/4KEY タブ切替式のサーバランキング表示 |

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

## チューニング表

| パラメータ | 値 | メモ |
|------------|-----|------|
| 解像度 | 720 x 1280 (FIT) | 縦長想定 |
| `baseInterval` | 700ms | MVP は固定 ([[../01-game-design/difficulty]]) |
| `MODES[2].count` | 2 | D/J |
| `MODES[4].count` | 4 | S/D/J/K |
| `stackVisibleCount` | 6 | 画面上のノーツ数 |
| `SESSION_DURATION_MS` | 60000 | 1 セッション長 |

## 関連

- [[stack|採用スタック]]
- [[conventions|コーディング規約]]
- [[../04-logs/2026-05-15|2026-05-15 転向ログ]]
