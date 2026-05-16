---
title: バックログ
tags: [tasks]
---

# バックログ

## Phase 0: プロジェクト初期化

- [x] ディレクトリ構造作成
- [x] package.json / tsconfig / vite.config / eslint / prettier 雛形
- [x] index.html ホスト
- [x] CLAUDE.md / README.md
- [ ] `npm install` 実行
- [ ] `npm run dev` で空シーンが表示されることを確認

## Phase 1: Obsidian Vault と CLAUDE.md

- [x] vault ディレクトリ構造
- [x] Home.md / 各ノート雛形
- [x] CLAUDE.md に運用ルール記載
- [x] キックオフログ ([[../04-logs/2026-05-04-kickoff]])

## Phase 2': 4キー達磨落とし MVP (2026-05-15 転向)

- [x] `GameConfig.ts` を 4 キー仕様へ書き換え (`LANES`, `COLORS.lane[]`, `SESSION_DURATION_MS`)
- [x] `Character` を `LaneKey` (S/D/J/K) 対応へ拡張
- [x] `CharacterStack` の型と抽選を 4 タイプ化
- [x] `InputController` を S/D/J/K キーボード入力へ書き換え
- [x] `ScoreManager.fail()` 追加 (床 0)
- [x] `GameScene` を 4 ゾーン描画 + 不正解ペナルティ + 60 秒タイマーへ書き換え
- [x] `TitleScene` / `GameOverScene` 文言調整
- [x] CLAUDE.md / vault ドキュメント更新
- [ ] `npm install` → ブラウザで [[../04-logs/2026-05-15|検証手順]] 通り確認

## Phase 2.5': 公開 (GitHub + Cloudflare Pages) — 2026-05-15

- [x] `typescript-eslint` を v8 へ上げて peer dep 衝突を解消
- [x] `.nvmrc` (Node 20) と `.wrangler/` 無視を追加
- [x] `git init` → 初回コミット → `kojietty/junpon` へ push
- [x] Cloudflare Pages ダッシュボードで GitHub 連携を有効化 (ユーザー作業)
- [x] GitHub Actions (`wrangler-action@v3`) でデプロイ → **https://jampon.pagudaruma.workers.dev/** で公開
- [x] README.md に公開 URL を追記

## Phase 3': 演出・難易度・タップ対応

- [ ] `DifficultyCurve` を `tickRefill` 間隔に再接続 (スコア連動の出現加速)
- [ ] モバイル向け 4 分割タップ入力 (`InputController` 拡張)
- [ ] 正解時のヒットエフェクト (パーティクル / 拡大演出)
- [ ] 不正解時のフィードバック強化 (シェイク・固有 SE)
- [ ] スコア +1 / -1 のフロート表示
- [ ] BGM
- [ ] プレースホルダ → 自作キャラ・アセットへの差し替え

## Phase 4: モバイル最適化・配信

- [ ] レスポンシブ検証 (Phaser Scale.FIT)
- [ ] 縦持ち / 横持ちでの操作感調整
- [ ] GitHub Pages デプロイ

## Phase 2.6': 2キーモード追加 — 2026-05-16

- [x] `GameConfig.ts` を `MODES` ルックアップに再構成（`LANES` / `DIFFICULTY.laneCount` 撤去、`GameMode` / `parseMode` / `STORAGE_KEYS.highScore(mode)` / `lastMode` 追加）
- [x] `Character` / `CharacterStack` / `InputController` をモード対応化
- [x] `RankingService` の `fetchTop(mode)` / `submit(nickname, score, mode)` 化
- [x] `BootScene` に旧 `jungle-tap:highscore` → `:4key` の冪等移行
- [x] `TitleScene` を 2KEY START / 4KEY START の 2 ボタン化、BEST 並記
- [x] `GameScene` / `GameOverScene` を `mode` 引き回し対応（ポーズリトライ含む）
- [x] `RankingScene` に 2KEY/4KEY タブ、フェッチキャッシュ、行 destroy/redraw
- [x] `worker.ts` を `mode` クエリ・カラム対応、レート制限はデバイス単位グローバル維持
- [x] `migrations/0001_add_mode_column.sql` 追加
- [x] vault / CLAUDE.md 更新 ([[../04-logs/2026-05-16]])
- [x] D1 migration を本番 (remote) に適用済み (`wrangler d1 execute jampondb --remote --file=migrations/0001_add_mode_column.sql`)
- [ ] ブラウザ実機で動作確認（プラン §動作確認手順）

## Phase 2.7': VS モード追加 — 2026-05-16

- [x] `migrations/0002_create_rooms.sql` (rooms + room_participants)
- [x] `worker.ts` に `/api/rooms` 系 5 ルート追加 (create/join/start/get/score)
- [x] `src/systems/SeededRng.ts` (mulberry32)
- [x] `CharacterStack` に `rng?` オプション注入 (ソロは Math.random フォールバック)
- [x] `src/services/VsService.ts` クライアント (createRoom / joinRoom / getRoom / startRoom / submitScore)
- [x] `VsMenuScene` (CREATE / JOIN)
- [x] `VsLobbyScene` (host: コード/START / guest: 参加待ち、TTL 表示)
- [x] `VsCountdownScene` (サーバ startAt 同期 → 3-2-1-GO)
- [x] `GameScene` を vs データ受け取り対応 (rng 注入 / 即 startGame / pause リタイア化 / VsResultScene 遷移)
- [x] `VsResultScene` (順位表、同点同順位、WIN/DRAW/N位、DNF 処理)
- [x] `TitleScene` に "VS PLAY (最大10人)" ボタン追加
- [x] `src/config/GameConfig.ts` に `VS` 定数
- [x] `src/main.ts` に Vs* シーン 4 つ追加
- [x] vault 更新 ([[../04-logs/2026-05-16]] / [[../01-game-design/vs-mode]] / [[../02-tech/vs-protocol]])
- [ ] D1 migration 適用 (`wrangler d1 execute jampondb --local --file=migrations/0002_create_rooms.sql` → 本番は `--remote`)
- [ ] ブラウザ複数タブでの動作確認 (CREATE → JOIN → START → 同シードノーツ → 結果)

## Phase 5: オプション

- [ ] 追加モード (3キー / 5キー — `MODES` テーブルへのエントリ追加だけで拡張可能になった)
- [ ] ボーナス用レアノーツ
- [ ] 終了直前のラストスパート演出
- [ ] VS モードでブラウザリロード復帰 (`localStorage` にアクティブ {code, token} 保存)
- [ ] VS の戦績集計 (ソロランキングとは別領域)

## 関連

- [[done|完了タスク]]
- [[../04-logs/2026-05-15|2026-05-15 転向ログ]]
