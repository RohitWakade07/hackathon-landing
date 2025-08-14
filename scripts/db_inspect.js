const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'src', 'data.db');
console.log('Inspecting DB at', dbPath);
try {
  const db = new Database(dbPath, { readonly: true });
  const tables = db.prepare("SELECT name, type FROM sqlite_master WHERE type IN ('table','view')").all();
  console.log('tables:', tables);
  if (tables.find(t=>t.name==='participants')) {
    const rows = db.prepare('SELECT id,teamName,leaderName,email,timestamp FROM participants ORDER BY id DESC LIMIT 10').all();
    console.log('recent rows:', rows);
  } else {
    console.log('participants table not found');
  }
  db.close();
} catch (e) {
  console.error('Error reading DB:', e);
}


