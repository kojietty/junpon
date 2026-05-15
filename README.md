# JUNGLE TAP

LINE Friends の「JUNGLE PANG」を参考にした、左右タップで色を仕分けるシンプルなブラウザゲーム。

> ⚠️ 本プロジェクトは個人学習・模倣練習を目的としています。LINE Friends のキャラクター・ロゴ・名称は使用していません。

## 動作環境

- Node.js 20 以上
- 任意のモダンブラウザ（Chrome / Edge / Safari / Firefox 最新）

## セットアップ

```bash
npm install
npm run dev
```

ターミナルに表示された URL（既定 `http://localhost:5173`）をブラウザで開く。

## ビルド

```bash
npm run build       # dist/ に静的ファイル生成
npm run preview     # ローカルで本番ビルドを確認
```

## ディレクトリ

| パス | 内容 |
|------|------|
| `src/` | ゲーム本体（TypeScript） |
| `public/assets/` | 画像・音声 |
| `docs/vault/` | 開発ノート（Obsidian vault） |
| `CLAUDE.md` | Claude Code 向けの規約・運用ルール |

## 開発ノート（Obsidian）

`docs/vault/` を Obsidian で「フォルダを vault として開く」と、設計メモ・議事ログ・タスクが見られます。

```
Obsidian → ファイル → vault を開く → D:\jungle\docs\vault
```

## ライセンス

未定（個人プロジェクト）。アセット出典は `docs/vault/05-assets/asset-list.md` に集約。
