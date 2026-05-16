---
title: 採用スタック
tags: [tech]
---

# 採用スタック

| 領域 | 採用 | 理由 |
|------|------|------|
| ゲームエンジン | **Phaser 3** | Scene/Input/Tween/Audio が統合、2D アーケード向けに最適 |
| 言語 | **TypeScript (strict)** | 型安全、Phaser の型定義との親和性 |
| ビルドツール | **Vite** | HMR 高速、設定軽量 |
| Lint | **ESLint + typescript-eslint** | 標準 |
| Format | **Prettier** | 標準 |
| パッケージ | **npm** | Windows 環境でのトラブル少 |
| 永続化 (クライアント) | **localStorage** | モード別ハイスコア / lastMode / deviceId / nickname |
| 永続化 (サーバ) | **Cloudflare D1 (SQLite)** | サーバランキング `scores` テーブル |
| バックエンド | **Cloudflare Workers (`worker.ts`)** | `/api/scores` GET/POST、静的アセット配信兼用 |
| デプロイ | **Cloudflare Pages / Workers** | `wrangler` 経由、`dist/` を ASSETS バインディングに |

## D1 マイグレーション運用

- `migrations/NNNN_<description>.sql` の連番ファイルで管理（手動採番）
- 適用コマンド:
  ```bash
  npx wrangler d1 execute jampondb --local  --file=migrations/000N_*.sql  # 開発
  npx wrangler d1 execute jampondb --remote --file=migrations/000N_*.sql  # 本番
  ```
- スキーマ変更時は worker.ts と同 PR / コミットで適用すること
- 既存行を破壊しない `ALTER TABLE ... DEFAULT ...` か、互換性のある追加カラムを優先

## 選定の経緯

- Pixi.js も候補だったが、Scene 管理・Tween など自前実装が増えるため Phaser を採用
- Unity / Godot より導入コストが低く、Web 配信前提と合致

## 関連

- [[architecture|アーキテクチャ]]
- [[conventions|コーディング規約]]
