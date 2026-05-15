---
title: 完了タスク
tags: [tasks]
---

# 完了タスク

> 完了したものを [[backlog|バックログ]] からここへ移動するためのアーカイブ。

## 2026-05-04

- プロジェクトディレクトリ構造作成
- package.json / tsconfig / vite / eslint / prettier 雛形作成
- index.html ホストファイル作成
- CLAUDE.md / README.md 作成
- Obsidian vault 構築（Home + 設計/技術/タスク/ログ/アセット ノート）

## 2026-05-15: 4キー達磨落とし MVP コード実装

- `GameConfig.ts` を 4 キー仕様へ書き換え (`LANES`, `COLORS.lane[]`, `SESSION_DURATION_MS`)
- `Character` を `LaneKey` (S/D/J/K) 対応へ拡張、`side` → `lane`
- `CharacterStack` の型と抽選を 4 タイプ化
- `InputController` を S/D/J/K キーボード入力へ書き換え
- `ScoreManager.fail()` 追加 (床 0、コンボリセット)
- `GameScene` を 4 ゾーン描画 + 不正解ペナルティ + 60 秒タイマー方式に書き換え
- `TitleScene` / `GameOverScene` 文言調整
- CLAUDE.md §1 を 4 キー版へ更新
- vault ドキュメント (overview / mechanics / difficulty / architecture / Home) を 4 キー版へ更新
- 2026-05-15 ログを ADR 形式で記録

## 関連

- [[backlog|バックログ]]
- [[../04-logs/2026-05-15|2026-05-15 転向ログ]]
