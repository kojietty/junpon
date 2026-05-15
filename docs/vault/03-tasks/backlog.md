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

## Phase 5: オプション

- [ ] 難易度モード (easy 3キー / normal 4キー / hard 5キー)
- [ ] ボーナス用レアノーツ
- [ ] 終了直前のラストスパート演出

## 関連

- [[done|完了タスク]]
- [[../04-logs/2026-05-15|2026-05-15 転向ログ]]
