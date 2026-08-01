const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const COA = require('./coa-master');
const { supabase } = require('./supabase-client');

// Use /tmp for cloud environments (firebase functions, vercel), local dir otherwise
const DB_DIR = process.env.FUNCTIONS_EMULATOR ? __dirname :
  (process.env.K_SERVICE || process.env.VERCEL ? '/tmp' : __dirname);
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

let syncTimeout = null;
function triggerSync() {
  if (!db || typeof db.saveDbAsync !== 'function') return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    db.saveDbAsync().catch(err => console.error('Auto-sync error:', err));
  }, 2000); // Debounce 2 seconds
}

function run(sql, params = []) {
  db.run(sql, params);
  // We STILL save locally synchronously so subsequent operations in the same request can see it
  saveDb();
  // Trigger an automatic async upload to Supabase
  triggerSync();
}

async function initDatabase() {
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  console.log('Downloading finance.db from Supabase...');
  // Try to download the DB from Supabase
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('pdam-storage')
    .download('db/finance.db');

  if (fileData && !downloadError) {
    console.log('Successfully downloaded finance.db from Supabase');
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(DB_PATH, buffer);
    db = new SQL.Database(buffer);
  } else {
    console.log('No existing DB in Supabase or failed to download. Using local/new DB.', downloadError?.message);
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
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
      detail TEXT DEFAULT '',
      hash TEXT DEFAULT '',
      prev_hash TEXT DEFAULT '',
      before_state TEXT DEFAULT '',
      after_state TEXT DEFAULT ''
    )
  `);

  // Dynamically add columns if they don't exist in legacy databases
  try { db.run('ALTER TABLE audit_log ADD COLUMN hash TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE audit_log ADD COLUMN prev_hash TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE audit_log ADD COLUMN before_state TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE audit_log ADD COLUMN after_state TEXT DEFAULT ""'); } catch(e) {}



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

  // Audit Log Hash Chaining Method
  db.insertAuditLog = function(kategori, sumber_file, deskripsi, status, detail, beforeState = null, afterState = null) {
    const timestamp = new Date().toISOString();
    
    // Get previous hash
    const prevLog = queryOne('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1');
    const prev_hash = prevLog && prevLog.hash ? prevLog.hash : 'GENESIS';

    const bsStr = beforeState ? JSON.stringify(beforeState) : '';
    const asStr = afterState ? JSON.stringify(afterState) : '';

    // Calculate Hash: SHA256(prev_hash + timestamp + kategori + sumber_file + deskripsi + status + before_state + after_state)
    const rawString = `${prev_hash}${timestamp}${kategori}${sumber_file}${deskripsi}${status}${bsStr}${asStr}`;
    const hash = crypto.createHash('sha256').update(rawString).digest('hex');

    run(`
      INSERT INTO audit_log 
      (timestamp, kategori, sumber_file, deskripsi, status, detail, hash, prev_hash, before_state, after_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [timestamp, kategori, sumber_file, deskripsi, status, detail, hash, prev_hash, bsStr, asStr]);

    return hash;
  };

  // ASYNC UPLOAD FUNCTION TO SYNC WITH SUPABASE
  db.saveDbAsync = async function() {
    console.log('Uploading finance.db to Supabase...');
    const data = db.export();
    const buffer = Buffer.from(data);
    
    const { error } = await supabase.storage
      .from('pdam-storage')
      .upload('db/finance.db', buffer, {
        upsert: true,
        contentType: 'application/x-sqlite3'
      });
      
    if (error) {
      console.error('Error uploading database to Supabase:', error);
      throw error;
    } else {
      console.log('Successfully synced finance.db to Supabase');
    }
  };

  return db;
}

module.exports = { initDatabase, queryAll, queryOne, run };

