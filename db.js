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
    last_battle INTEGER DEFAULT 0
  )
`);

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
        last_battle = ?
      WHERE id = ?
    `).run(
      user.nickname, user.rank, user.points,
      user.total_enhance, user.last_work, user.last_boss,
      user.last_battle, user.id
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
