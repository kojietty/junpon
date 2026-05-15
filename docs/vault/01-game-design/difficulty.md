---
title: 難易度カーブ
tags: [design, tuning]
---

# 難易度カーブ

> 2026-05-15 更新: MVP では難易度カーブは無効化し、固定値で運用。Phase 2 で再活性化予定。
> ⚠️ すべて初期仮値。ブラウザで触って調整する前提。

## 現在のパラメータ (MVP・固定値)

| 名称 | 値 | 意味 |
|------|-----|------|
| `baseInterval` | 700 ms | 補充間隔 (固定) |
| `laneCount` | 4 | ノーツタイプ数 = キー数 |
| `stackVisibleCount` | 6 | 画面上に見えるノーツ数 |
| `SESSION_DURATION_MS` | 60_000 ms | 1 セッションの長さ |

## Phase 2 で再活性化予定の式

```
interval(score) = max(minInterval, baseInterval - decayPerScore * score)
```

| 名称 | 候補値 | 意味 |
|------|--------|------|
| `minInterval` | 200 ms | 最高速時の下限 |
| `decayPerScore` | 8 ms | スコア +1 あたりの短縮量 |

## 段階拡張アイデア (将来)

- スコア 100 でレアノーツ (ボーナス得点) を出現させる
- スコア 200 で「フェイント」モーション (少し揺れる) を追加
- 残り 10 秒で全体加速のラストスパート演出

## 関連

- [[mechanics|メカニクス]]
