-- VS モード: 最大10人準同期対戦のためのルーム管理。
-- 既存 `scores` とライフサイクルが違う (append-only vs 数分で TTL) ため分離する。

CREATE TABLE IF NOT EXISTS rooms (
  code         TEXT PRIMARY KEY,
  mode         INTEGER NOT NULL,
  seed         INTEGER NOT NULL,
  max_players  INTEGER NOT NULL,
  host_token   TEXT NOT NULL,
  host_device  TEXT NOT NULL,
  start_at     INTEGER,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rooms_expires ON rooms(expires_at);

CREATE TABLE IF NOT EXISTS room_participants (
  code        TEXT NOT NULL,
  slot        INTEGER NOT NULL,
  token       TEXT NOT NULL,
  device      TEXT NOT NULL,
  nickname    TEXT NOT NULL,
  score       INTEGER,
  plays       INTEGER,
  joined_at   INTEGER NOT NULL,
  PRIMARY KEY (code, slot)
);
CREATE INDEX IF NOT EXISTS idx_participants_code ON room_participants(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_token ON room_participants(token);
