import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'huashi.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS studios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    district TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    cover_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    nickname TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    real_name TEXT NOT NULL DEFAULT '',
    student_id_url TEXT NOT NULL DEFAULT '',
    studio_id INTEGER,
    class_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'circle_master', 'admin')),
    is_verified INTEGER NOT NULL DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'none' CHECK(verification_status IN ('none', 'pending', 'approved', 'rejected')),
    verification_method TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (studio_id) REFERENCES studios(id)
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    studio_id INTEGER,
    board TEXT NOT NULL DEFAULT 'circle' CHECK(board IN ('circle', 'market', 'fan')),
    circle_type TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    images TEXT NOT NULL DEFAULT '[]',
    is_anonymous INTEGER NOT NULL DEFAULT 0,
    is_public INTEGER NOT NULL DEFAULT 1,
    price REAL,
    item_condition TEXT,
    market_tag TEXT NOT NULL DEFAULT 'sell',
    market_category TEXT NOT NULL DEFAULT 'art_supplies',
    like_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (studio_id) REFERENCES studios(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id),
    FOREIGN KEY (following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    studio_id INTEGER NOT NULL,
    is_used INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (studio_id) REFERENCES studios(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,
    last_message TEXT NOT NULL DEFAULT '',
    last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),
    UNIQUE(user1_id, user2_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'system' CHECK(type IN ('system', 'verify_result', 'like', 'comment')),
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    related_post_id INTEGER,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_post_id) REFERENCES posts(id)
  );
`);

// Migration: upgrade old circle_type values to new categories
try {
  const hasOld = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE circle_type IN ('study','notice','artwork','secondhand','fan')").get();
  if (hasOld && hasOld.cnt > 0) {
    // Save data from all tables that FK-reference posts
    const depTables = ['comments', 'likes', 'favorites', 'notifications'];
    const backup = {};
    for (const tbl of depTables) {
      backup[tbl] = db.prepare(`SELECT * FROM ${tbl}`).all();
    }
    const postsData = db.prepare('SELECT * FROM posts').all();

    db.exec(`PRAGMA foreign_keys = OFF;`);

    // Drop dependent tables first, then posts
    for (const tbl of [...depTables].reverse()) {
      db.exec(`DROP TABLE IF EXISTS ${tbl}`);
    }
    db.exec(`DROP TABLE IF EXISTS posts`);

    // Create posts with new schema (no CHECK constraint on circle_type)
    db.exec(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        studio_id INTEGER,
        board TEXT NOT NULL DEFAULT 'circle' CHECK(board IN ('circle', 'market', 'fan')),
        circle_type TEXT NOT NULL DEFAULT 'general',
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        images TEXT NOT NULL DEFAULT '[]',
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        is_public INTEGER NOT NULL DEFAULT 1,
        price REAL,
        item_condition TEXT,
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (studio_id) REFERENCES studios(id)
      )
    `);

    // Re-insert posts with mapped circle_type
    const mapType = { study: 'general', notice: 'general', artwork: 'general', secondhand: 'other', fan: 'other' };
    const insertPost = db.prepare(`INSERT INTO posts (id,user_id,studio_id,board,circle_type,title,content,images,is_anonymous,is_public,price,item_condition,market_tag,market_category,like_count,comment_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const p of postsData) {
      const newType = mapType[p.circle_type] || p.circle_type;
      insertPost.run(p.id, p.user_id, p.studio_id, p.board, newType, p.title, p.content, p.images, p.is_anonymous, p.is_public, p.price, p.item_condition, p.market_tag || 'sell', p.market_category || 'art_supplies', p.like_count, p.comment_count, p.created_at, p.updated_at);
    }

    // Recreate dependent tables with their original schemas
    db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'system' CHECK(type IN ('system', 'verify_result', 'like', 'comment')),
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        related_post_id INTEGER,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (related_post_id) REFERENCES posts(id)
      )
    `);

    // Re-insert dependent data
    for (const tbl of depTables) {
      if (backup[tbl].length === 0) continue;
      const cols = Object.keys(backup[tbl][0]);
      const placeholders = cols.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO ${tbl} (${cols.join(',')}) VALUES (${placeholders})`);
      for (const row of backup[tbl]) {
        stmt.run(...cols.map(c => row[c]));
      }
    }

    db.exec(`PRAGMA foreign_keys = ON;`);
    console.log('Migrated posts.circle_type to new categories');
  }
} catch (e) {
  // table may not exist yet on fresh install, ignore
}

// Migration: add market_tag and market_category columns (if not exist)
try {
  const cols = db.prepare("SELECT name FROM pragma_table_info('posts')").all().map(r => r.name);
  if (!cols.includes('market_tag')) {
    db.exec("ALTER TABLE posts ADD COLUMN market_tag TEXT NOT NULL DEFAULT 'sell'");
    db.exec("ALTER TABLE posts ADD COLUMN market_category TEXT NOT NULL DEFAULT 'art_supplies'");
    console.log('Added market_tag and market_category columns to posts');
  }
} catch (e) {
  // table may not exist, ignore
}

// Migration: add username, password_hash, sys_user_id to users
try {
  const cols = db.prepare("SELECT name FROM pragma_table_info('users')").all().map(r => r.name);
  if (!cols.includes('username')) {
    db.exec("ALTER TABLE users ADD COLUMN username TEXT");
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
    db.exec("ALTER TABLE users ADD COLUMN sys_user_id TEXT");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sys_user_id ON users(sys_user_id)");
    console.log('Added username, password_hash, sys_user_id columns to users');
  }
} catch (e) {
  // table may not exist, ignore
}

// Migration: add wx_openid to users (微信小程序)
try {
  const cols = db.prepare("SELECT name FROM pragma_table_info('users')").all().map(r => r.name);
  if (!cols.includes('wx_openid')) {
    db.exec("ALTER TABLE users ADD COLUMN wx_openid TEXT");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wx_openid ON users(wx_openid)");
    console.log('Added wx_openid column to users');
  }
} catch (e) {
  // table may not exist, ignore
}

// Migration: fix tables referencing posts_old instead of posts
try {
  const fixTable = (tbl, def) => {
    const info = db.prepare(`SELECT sql FROM sqlite_master WHERE name='${tbl}'`).get();
    if (!info || !info.sql.includes('posts_old')) return false;
    const data = db.prepare(`SELECT * FROM ${tbl}`).all();
    db.exec(`DROP TABLE IF EXISTS ${tbl}`);
    db.exec(def);
    if (data.length > 0) {
      const cols = Object.keys(data[0]);
      const placeholders = cols.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO ${tbl} (${cols.join(',')}) VALUES (${placeholders})`);
      for (const row of data) stmt.run(...cols.map(c => row[c]));
    }
    return true;
  };

  const fixed = [];
  if (fixTable('comments', `
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`)) fixed.push('comments');
  if (fixTable('likes', `
    CREATE TABLE likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`)) fixed.push('likes');
  if (fixTable('favorites', `
    CREATE TABLE favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`)) fixed.push('favorites');
  if (fixTable('notifications', `
    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'system' CHECK(type IN ('system', 'verify_result', 'like', 'comment')),
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      related_post_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (related_post_id) REFERENCES posts(id)
    )`)) fixed.push('notifications');
  if (fixed.length > 0) console.log(`Fixed FK references (posts_old → posts) for: ${fixed.join(', ')}`);
} catch (e) {
  // table may not exist, ignore
}

export default db;
