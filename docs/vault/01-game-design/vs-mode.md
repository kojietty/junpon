---
title: VS モード
tags: [game-design]
---

# VS モード — 最大10人ルームコード対戦 (準同期)

## 全体像

ロビーで集合 → ホストが START → 全員が同シードのノーツ列を 60 秒プレイ → 結果でスコア突き合わせ。**プレイ中は通信ゼロ**。

```
TitleScene → VsMenuScene
                ├─ CREATE (mode, maxPlayers, nickname)
                │     ↓
                │   VsLobbyScene{role:host}
                │
                └─ JOIN (code, nickname)
                      ↓
                    VsLobbyScene{role:guest}
                          ↓ poll で status=starting
                    VsCountdownScene (startAt 同期)
                          ↓
                    GameScene{vs, seed → mulberry32}
                          ↓ 60 秒
                    VsResultScene (順位表)
```

## ルール

- **人数**: 2〜10 人 (ホストがルーム作成時に決定)
- **キーモード**: ホストが 2KEY / 4KEY を選択。ゲストは強制的にホスト指定モードで参加
- **時間**: 60 秒 (ソロと同じ)
- **ノーツ**: サーバ生成の 32bit シードを基に [[../02-tech/architecture|mulberry32]] で全端末同一の lane 列を再生
- **スコア計算**: ソロと完全に同じ ([[mechanics|mechanics]] 参照、success +1 / コンボ 10/25/50 で +5 / fail -1 床 0)
- **勝敗**:
  - 最高得点が単独なら `WIN!`
  - 自分が同点トップなら `DRAW`
  - それ以外は `N位`
  - 同点は同順位 (1, 1, 3, 4...)

## ロビー仕様

- ホストはルームコード (6 桁、3-3 区切り `ABC-XYZ`) を大表示
- 参加者リスト (slot 1 = 👑、自分は黄色) と空きスロットを max_players 分表示
- ホスト: 人数 ≥ 2 で START 有効
- ゲスト: 「ホストの開始を待っています」
- TTL: 10 分。ロビー画面に残り時間を `M:SS` で表示

## 結果仕様

- 順位表 (score 降順、同点同順位)
- 自分の行をハイライト
- 開始 + 120 秒経過しても揃わない参加者は `DNF` 表示 (score 0 扱い)
- ルームが消えていても自分のスコアだけは表示する

## ソロ機能との関係

- **対戦結果は既存 [[mechanics|ソロランキング]] に一切登録されない** (完全分離)
- 既存ソロのハイスコア (`jungle-tap:highscore:Nkey`) や device_id / last-nickname は VS でも共用

## タイムアウト/離脱

| ケース | 挙動 |
|---|---|
| ホストが START を押さない | TTL 10 分で自動失効 |
| 満員ルームに JOIN | `409 room full` → 「満員です」 |
| 存在しないコード | `404` → 「ルームが見つかりません」 |
| 開始済みルームに JOIN | `409 already started` |
| プレイ中の離脱 (ブラウザ閉じる/リタイア) | 120 秒で DNF、他参加者の集計は続行 |
| ポーズメニュー | vs 時は「リタイア」「対戦から離脱」(score=0 で確定) |
| ブラウザリロード | MVP では復帰なし。離脱と同等 |

## 不正対策

- スコア上限 500 (理論上限 ~400)
- 入力回数 (plays) 上限 600 (10/秒 × 60)
- スコア受付窓 = `start_at + 55s ~ +120s`
- 二重送信は worker 側で reject (score NOT NULL 状態の UPDATE 失敗)
- token 不一致は 403

## 関連

- [[mechanics|メカニクス]] — スコア計算ロジックは共通
- [[../02-tech/architecture|アーキテクチャ]] — Scene 図・データフロー
- [[../02-tech/vs-protocol|VS プロトコル]] — REST API 仕様
- [[../04-logs/2026-05-16|2026-05-16 ログ]] — 設計判断
