const Database = require("better-sqlite3");
const db = new Database("game.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT,
    rank INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    total_enhance INTEGER DEFAULT 0,
    last_work INTEGER DEFAULT 0,
    last_boss INTEGER DEFAULT 0,
    last_battle INTEGER DEFAULT 0,
    last_resign INTEGER DEFAULT 0,
    resign_count INTEGER DEFAULT 0,
    fever_type TEXT DEFAULT NULL,
    fever_end INTEGER DEFAULT 0
  )
`);

// 기존 테이블에 컬럼 없으면 추가
try { db.exec(`ALTER TABLE users ADD COLUMN last_resign INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN resign_count INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN fever_type TEXT DEFAULT NULL`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN fever_end INTEGER DEFAULT 0`); } catch(e) {}

module.exports = {
  getUser(id, nickname) {
    let user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!user) {
      db.prepare(
        "INSERT INTO users (id, nickname) VALUES (?, ?)"
      ).run(id, nickname);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    }
    return user;
  },

  saveUser(user) {
    db.prepare(`
      UPDATE users SET
        nickname = ?,
        rank = ?,
        points = ?,
        total_enhance = ?,
        last_work = ?,
        last_boss = ?,
        last_battle = ?,
        last_resign = ?,
        resign_count = ?,
        fever_type = ?,
        fever_end = ?
      WHERE id = ?
    `).run(
      user.nickname, user.rank, user.points,
      user.total_enhance, user.last_work, user.last_boss,
      user.last_battle, user.last_resign || 0, user.resign_count || 0,
      user.fever_type || null, user.fever_end || 0,
      user.id
    );
  },

  getRanking() {
    return db.prepare(
      "SELECT * FROM users ORDER BY rank DESC, points DESC LIMIT 10"
    ).all();
  },

  getUserByNickname(nickname) {
    return db.prepare("SELECT * FROM users WHERE nickname = ?").get(nickname);
  }
};
