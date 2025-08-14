const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'src', 'data.db');
console.log('Opening DB at', dbPath);
const db = new Database(dbPath);
const sql = `
CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teamName TEXT,
    teamSize TEXT,
    leaderName TEXT,
    phone TEXT,
    email TEXT,
    college TEXT,
    year TEXT,
    track TEXT,
    github TEXT,
    experience TEXT,
    members TEXT,
    projectIdea TEXT,
    agree TEXT,
    consent TEXT,
    ppt_path TEXT,
    timestamp TEXT
);
`;
db.exec(sql);
console.log('Ensured participants table exists');
db.close();


