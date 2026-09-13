CREATE TABLE photos (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 date TEXT NOT NULL,
 time TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('manual','glasses')),
 external_id TEXT,
 image BLOB NOT NULL,
 analysis TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed')),
 record_id TEXT REFERENCES records(id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,source,external_id)
);
CREATE INDEX photos_user_date ON photos(user_id,date);
