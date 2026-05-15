---
title: コーディング規約
tags: [tech]
---

# コーディング規約

詳細は [プロジェクトルートの CLAUDE.md](../../../CLAUDE.md) を参照。要点だけここに：

## ファイル名

| 種類 | 形式 | 例 |
|------|------|------|
| クラスを export する .ts | PascalCase | `CharacterStack.ts` |
| ユーティリティ関数の .ts | kebab-case | `random-color.ts` |
| ディレクトリ | kebab-case | `src/scenes/` |

## 命名

- クラス・型: `PascalCase`
- 関数・変数: `camelCase`
- 定数: `UPPER_SNAKE_CASE`

## TypeScript

- `strict: true`、`any` 禁止
- 型は `import type` を使う
- magic number は `src/config/GameConfig.ts` に集約

## コメント

「なぜ」だけ書く。何をしているかは識別子で表現する。

## 関連

- [[stack|採用スタック]]
- [[architecture|アーキテクチャ]]
