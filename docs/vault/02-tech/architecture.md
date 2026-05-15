---
title: アーキテクチャ
tags: [tech]
---

# アーキテクチャ

## Scene 構成

```
BootScene → PreloadScene → TitleScene ⇄ GameScene → GameOverScene
                                                ↑           │
                                                └───────────┘ (リトライ)
```

| Scene | 役割 |
|-------|------|
| `BootScene` | ローダ初期化、最低限の設定 |
| `PreloadScene` | 画像・音声の事前読込・進捗バー表示 |
| `TitleScene` | タイトル表示・スタート待機 |
| `GameScene` | ゲーム本編（[[../01-game-design/mechanics]]） |
| `GameOverScene` | スコア・ハイスコア表示・リトライ |

## オブジェクト

- `Character`: `lane: LaneKey (0-3)` プロパティと表示（色 + キー文字）
- `CharacterStack`: ノーツの縦並びを保持。`peekBottom()` / `consumeBottom()` / `tickRefill()`

## システム

- `InputController`: キーボード S/D/J/K を統一して `LaneKey (0-3)` を発火 (pointer は Phase 2)
- `ScoreManager`: スコア・コンボ・ハイスコア (localStorage)。`success()` / `fail()` (床 0)
- `DifficultyCurve`: スコア → `interval` 計算 (MVP では未使用、Phase 2 で復活)

## データフロー

```
keydown(S/D/J/K) → InputController → GameScene.onInput(lane)
  → CharacterStack.peekBottom() と比較
    → 一致: stack.consumeBottom() + ScoreManager.success()
    → 不一致: ScoreManager.fail()  (スコア -1, 床 0, コンボリセット, 軽い赤フラッシュ)

60秒タイマー満了 → GameOverScene.start({ score })
```

## チューニング表

| パラメータ | 値 | メモ |
|------------|-----|------|
| 解像度 | 720 x 1280 (FIT) | 縦長想定 |
| `baseInterval` | 700ms | MVP は固定 ([[../01-game-design/difficulty]]) |
| `laneCount` | 4 | S/D/J/K |
| `stackVisibleCount` | 6 | 画面上のノーツ数 |
| `SESSION_DURATION_MS` | 60000 | 1 セッション長 |

## 関連

- [[stack|採用スタック]]
- [[conventions|コーディング規約]]
- [[../04-logs/2026-05-15|2026-05-15 転向ログ]]
