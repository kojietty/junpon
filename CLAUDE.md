# CLAUDE.md — JUNGLE TAP プロジェクト規約

このファイルは Claude Code が本リポジトリで作業する際の規約・運用ルールをまとめたものです。新しいセッションを開始したらまず本書を読み、特に「Obsidian Vault 運用」セクションに従って作業ログを残してください。

---

## 1. プロジェクト概要

- **何を作るか**: 中央に積まれたノーツを下から達磨落とし式に消していくアーケード Web ゲーム（コードネーム: **JUNGLE TAP** / 公開名 **JAMPON**）
- **メカニクス**: スタック最下段のノーツのタイプに対応するキーを押すと消える。不正解は **スコア -1 ペナルティ** (床 0)。60 秒の制限時間でスコアを稼ぐ。**2 キーモード (D/J) / 4 キーモード (S/D/J/K)** をタイトルで選択可能。ハイスコア・サーバランキングはモード別に完全分離
- **配信先**: Web ブラウザ（PC / モバイル）。Cloudflare Workers + D1 でランキングをホスト
- **スコープ**: 元は LINE Friends の Android ゲーム「JUNGLE PANG」をベースに左右 2 キーで開発開始 → 2026-05-15 に 4 キー化へ転向 → 2026-05-16 に 2 キーモード追加（共存）。キャラクターは独自意匠（著作権配慮）
- **詳細仕様**: [docs/vault/01-game-design/](docs/vault/01-game-design/) を参照

---

## 2. 技術スタック

| 領域 | 採用 |
|------|------|
| エンジン | Phaser 3 |
| 言語 | TypeScript (strict) |
| ビルド | Vite |
| Lint/Format | ESLint + Prettier |
| 永続化 (クライアント) | localStorage（モード別ハイスコア、lastMode、device id） |
| 永続化 (サーバ) | Cloudflare D1（`scores` テーブル、`mode` カラムで分離） |
| バックエンド | Cloudflare Workers (`worker.ts`) / `/api/scores` GET・POST |
| マイグレーション | `migrations/NNNN_*.sql` を `wrangler d1 execute` で手動適用 |

---

## 3. セットアップ & よく使うコマンド

```bash
# 初回のみ
npm install

# 開発サーバ（http://localhost:5173 で開く）
npm run dev

# 本番ビルド
npm run build

# ビルド成果物のローカル確認
npm run preview

# Lint / Format
npm run lint
npm run format
```

---

## 4. ディレクトリ構成

```
src/
  main.ts              # Phaser.Game エントリ
  config/              # エンジン設定
  scenes/              # Boot / Preload / Title / Game / GameOver
  objects/             # Character, CharacterStack
  systems/             # InputController, ScoreManager, DifficultyCurve
public/assets/         # 画像・音声（公開アセット）
docs/vault/            # Obsidian vault（後述）
```

---

## 5. コーディング規約

- **ファイル名**: クラスを export する .ts は `PascalCase.ts`、それ以外は `kebab-case.ts`。ディレクトリは `kebab-case`。
- **クラス/型**: `PascalCase`、関数/変数: `camelCase`、定数: `UPPER_SNAKE_CASE`。
- **import の絶対パス**: `@/` エイリアスで `src/` 配下を参照可（`tsconfig.json` / `vite.config.ts` 設定済）。
- **コメント**: 「なぜ」だけ書く。何をしているかは識別子で表現する。
- **TS の `any` は原則禁止**。Phaser 由来の型は `phaser` パッケージの型定義を使う。
- **マジックナンバーは `src/config/GameConfig.ts` に集約**（解像度、色、スピード基準など）。
- **DOM への直接 console.log は控える**。Phaser 内のデバッグは `Phaser.Scene.add.text` か Vite の HMR で済ませる。

---

## 6. Obsidian Vault 運用（重要）

このプロジェクトでは作業履歴・設計判断を `docs/vault/` の Obsidian vault に蓄積します。**Claude は次のタイミングで vault を更新してください。**

### 6.1 vault 構成

```
docs/vault/
  Home.md                       # ハブ。全ノートへの導線
  01-game-design/               # ゲーム仕様
  02-tech/                      # 技術選定・アーキテクチャ
  03-tasks/backlog.md           # タスクリスト（チェックボックス）
  03-tasks/done.md              # 完了タスクのアーカイブ
  04-logs/YYYY-MM-DD.md         # 日次の作業ログ
  05-assets/asset-list.md       # 必要素材
```

### 6.2 更新ルール

| トリガー | 更新先 |
|----------|--------|
| 新しい会話セッションを開始した日に最初に作業するとき | `04-logs/YYYY-MM-DD.md` を新規作成し、目的を冒頭に書く |
| 設計判断・仕様変更が発生したとき | 該当する `01-game-design/*.md` または `02-tech/*.md` を即時更新し、`04-logs` にも一行サマリ追加 |
| タスクを開始 / 完了したとき | `03-tasks/backlog.md` のチェックボックスを更新。完了したものは `03-tasks/done.md` へ移動可 |
| 議論・トレードオフ・意思決定があったとき | `04-logs/YYYY-MM-DD.md` に「決定 / 理由 / 代替案」のミニ ADR 形式で記録 |

### 6.3 書き方の指針

- ノート間は `[[wikilink]]` で接続し、`Home.md` から辿れる状態を維持する
- 日次ログの先頭に `## YYYY-MM-DD HH:MM` の見出しで時刻スタンプを付ける（同日内の追記用）
- 長文を書かない。箇条書き・表・短文段落で素早く読めるように
- ファイル名に空白は使わない（kebab-case）

---

## 7. Git 運用

- ブランチ運用は最小限：ローカルでは `main` への直 push で OK（個人開発前提）
- 大きな変更は別ブランチ → セルフ PR で履歴を整える
- コミットメッセージは英語または日本語、prefix を付ける: `feat: / fix: / chore: / docs: / refactor:`
- `dist/`、`node_modules/`、`docs/vault/.obsidian/workspace*.json` は commit しない（`.gitignore` 済）

---

## 8. 著作権・素材

- LINE Friends の **キャラクター・名称・ロゴ・配色を直接流用しない**
- 元ゲームはメカニクスの参考に留める
- アセット（画像・音）は CC0 または自作のもののみを使う。出典は `05-assets/asset-list.md` に必ず記録
- プレースホルダの幾何学図形 → 自作キャラへ段階的に差し替え

---

## 9. 進め方の原則

- **一度に大きく作らない**: 動く最小スライスを早く作って、必ずブラウザで触って確認する
- **数値はまず仮で入れて、後で `02-tech/architecture.md` の「チューニング表」にまとめる**
- **質問するか実装するか迷ったら、まず Plan モード or AskUserQuestion で短く確認**
