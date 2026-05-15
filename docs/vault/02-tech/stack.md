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
| 永続化 | **localStorage** | バックエンド不要、ハイスコアのみ保存 |
| デプロイ | **GitHub Pages / Cloudflare Pages**（任意） | 静的のみで完結 |

## 選定の経緯

- Pixi.js も候補だったが、Scene 管理・Tween など自前実装が増えるため Phaser を採用
- Unity / Godot より導入コストが低く、Web 配信前提と合致

## 関連

- [[architecture|アーキテクチャ]]
- [[conventions|コーディング規約]]
