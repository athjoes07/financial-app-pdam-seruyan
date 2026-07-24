const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const COA = require('./coa-master');

// Use /tmp for cloud environments (firebase functions), local dir otherwise
const DB_DIR = process.env.FUNCTIONS_EMULATOR ? __dirname :
  (process.env.K_SERVICE ? '/tmp' : __dirname);
const DB_PATH = path.join(DB_DIR, 'finance.db');
let db;

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS akun (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      tipe TEXT NOT NULL CHECK(tipe IN ('aset','kewajiban','ekuitas','pendapatan','beban')),
      saldo_normal TEXT NOT NULL CHECK(saldo_normal IN ('debit','kredit')),
      kategori TEXT DEFAULT ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL DEFAULT (date('now')),
      deskripsi TEXT NOT NULL,
      sumber TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS jurnal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaksi_id INTEGER NOT NULL,
      akun_id INTEGER NOT NULL,
      debit REAL DEFAULT 0,
      kredit REAL DEFAULT 0,
      FOREIGN KEY (transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE,
      FOREIGN KEY (akun_id) REFERENCES akun(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      kategori TEXT NOT NULL,
      sumber_file TEXT DEFAULT '',
      deskripsi TEXT NOT NULL,
      status TEXT DEFAULT 'SUCCESS',
      detail TEXT DEFAULT ''
    )
  `);

  const count = queryOne('SELECT COUNT(*) as cnt FROM akun');
  if (count.cnt === 0) {
    const stmt = db.prepare('INSERT INTO akun (kode, nama, tipe, saldo_normal, kategori) VALUES (?, ?, ?, ?, ?)');
    for (const a of COA) {
      stmt.bind([a.kode, a.nama, a.tipe, a.saldo_normal, a.kategori]);
      stmt.step();
      stmt.reset();
    }
    stmt.free();
    saveDb();
  }

  db.queryAll = queryAll;
  db.queryOne = queryOne;
  db.queryRun = run;

  return db;
}

module.exports = { initDatabase, queryAll, queryOne, run };
