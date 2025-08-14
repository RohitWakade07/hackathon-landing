const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require('cors');
const multer = require("multer");
const ExcelJS = require('exceljs');
const Database = require('better-sqlite3');
const { z } = require('zod');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = express();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Trust reverse proxy (needed for rate limiting behind proxies)
app.set('trust proxy', 1);

// Security and performance middleware
app.use(helmet());
// Content Security Policy tuned to allow our CDNs and inline blocks used in static pages
app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "https://code.jquery.com", "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://stackpath.bootstrapcdn.com"],
        "img-src": ["'self'", "data:", "https://images.unsplash.com"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        // frame-ancestors left to defaults; add as needed
    }
}));
app.use(compression());
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s=>s.trim()) : true
}));

// Serve only public assets (no server code/data)
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images'), { maxAge: '30d', etag: true }));
app.use('/', express.static(__dirname, { maxAge: '1h', etag: true, extensions: ['html'] , setHeaders(res, path){
  // prevent serving sensitive files by default
  const deny = [/server\.js$/, /data\.db$/, /data\.xlsx$/, /server\.log$/, /uploads\//];
  if (deny.some(r=>r.test(path))) {
    res.status(403);
  }
}}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Quietly handle missing favicon to avoid 404 noise
app.get('/favicon.ico', (req, res) => res.status(204).end());

// simple file logger to help debug in environments where foreground logs are hard to view
const logFile = path.join(__dirname, 'server.log');
function logLine(message, obj) {
    const time = new Date().toISOString();
    let line = `[${time}] ${message}`;
    if (obj !== undefined) {
        try { line += ' ' + JSON.stringify(obj); } catch (_) {}
    }
    fs.appendFileSync(logFile, line + "\n");
}

// Development convenience: default ADMIN_TOKEN when not set
const DEFAULT_ADMIN_TOKEN = '500600RSW@';
if (!process.env.ADMIN_TOKEN) {
    process.env.ADMIN_TOKEN = DEFAULT_ADMIN_TOKEN;
    logLine('ADMIN_TOKEN not set; defaulting to ' + DEFAULT_ADMIN_TOKEN);
}

// Central data directory (configure a persistent volume in production)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const filePath = path.join(DATA_DIR, "data.xlsx");
// Move uploads out of static serving path, into DATA_DIR
const uploadDir = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Initialize SQLite DB
const dbPath = path.join(DATA_DIR, 'data.db');
const db = new Database(dbPath);
db.prepare(`
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
    )
`).run();
logLine('SQLite initialized at ' + dbPath);

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
        const safeTeam = (req.body.teamName || 'team').toString().replace(/[^a-z0-9-_]/gi, '_');
        const ts = Date.now();
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${safeTeam}_${ts}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.ppt', '.pptx', '.pdf'];
        const allowedMime = ['application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/pdf'];
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (allowedExt.includes(ext) && (allowedMime.includes(file.mimetype))) return cb(null, true);
        cb(new Error('Invalid file type'));
    }
});

app.post("/submit", upload.single('ppt'), async (req, res) => {
    try {
        // Validate and sanitize input
        const schema = z.object({
            teamName: z.string().min(1).max(100),
            teamSize: z.string().regex(/^([1-5])$/),
            name: z.string().min(1).max(100),
            phone: z.string().regex(/^\d{10}$/),
            email: z.string().email().max(200),
            college: z.string().min(1).max(150),
            year: z.string().max(20).optional(),
            track: z.string().min(1).max(80),
            github: z.string().url().max(300).optional().or(z.literal('')).optional(),
            experience: z.string().max(30).optional(),
            members: z.string().max(500).optional(),
            projectIdea: z.string().max(2000).optional(),
            agree: z.any().optional(),
            consent: z.any().optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: 'Invalid submission', issues: parsed.error.issues });
        }
        const data = parsed.data;
        let workbook, worksheet;
        if (fs.existsSync(filePath)) {
            workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            worksheet = workbook.getWorksheet("Participants");
            if (!worksheet) {
                worksheet = workbook.addWorksheet("Participants");
                worksheet.addRow([

                    "Team Name", "Team Size", "Leader Name", "Phone", "Email", "College", "Year", "Track",
                    "GitHub / Portfolio", "Experience", "Members", "Project Idea", "Agree", "Consent", "PPT Path", "Timestamp"
                ]);
            }
        } else {
            workbook = new ExcelJS.Workbook();
            worksheet = workbook.addWorksheet("Participants");
            worksheet.addRow([

                "Team Name", "Team Size", "Leader Name", "Phone", "Email", "College", "Year", "Track",
                "GitHub / Portfolio", "Experience", "Members", "Project Idea", "Agree", "Consent", "PPT Path", "Timestamp"
            ]);
        }

        worksheet.addRow([
            data.teamName || "",
            data.teamSize || "",
            data.name || "",
            data.phone || "",
            data.email || "",
            data.college || "",
            data.year || "",
            data.track || "",
            data.github || "",
            data.experience || "",
            data.members || "",
            data.projectIdea || "",
            data.agree ? "Yes" : "No",
            data.consent ? "Yes" : "No",
            req.file ? path.relative(__dirname, req.file.path) : "",
            new Date().toISOString()
        ]);
        await workbook.xlsx.writeFile(filePath);

        // also insert into sqlite
        try {
            const insert = db.prepare(`INSERT INTO participants
                (teamName, teamSize, leaderName, phone, email, college, year, track, github, experience, members, projectIdea, agree, consent, ppt_path, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const info = insert.run(
                data.teamName || '',
                data.teamSize || '',
                data.name || '',
                data.phone || '',
                data.email || '',
                data.college || '',
                data.year || '',
                data.track || '',
                data.github || '',
                data.experience || '',
                data.members || '',
                data.projectIdea || '',
                data.agree ? 'Yes' : 'No',
                data.consent ? 'Yes' : 'No',
                req.file ? path.relative(__dirname, req.file.path) : '',
                new Date().toISOString()
            );
            logLine('SQLite insert success', { lastInsertRowid: info.lastInsertRowid, changes: info.changes });
        } catch (dbErr) {
            console.error('SQLite insert error:', dbErr);
            logLine('SQLite insert error', { error: String(dbErr && dbErr.message || dbErr) });
        }

        // Avoid logging PII in plaintext
        logLine('New Registration', { teamName: req.body.teamName, teamSize: req.body.teamSize, track: req.body.track });
        res.json({ message: "✅ Registration Successful!" });
    } catch (err) {
        console.error("Error saving registration:", err);
        logLine('Submit handler error', { error: String(err && err.message || err) });
        res.status(500).json({ message: "❌ Server error. Could not save registration." });
    }
});

// Serve admin static pages
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// helper: require admin token
function requireAdmin(req, res, next) {
    const token = req.get('x-admin-token') || req.query.token;
    if (!process.env.ADMIN_TOKEN) {
        return res.status(500).json({ message: 'Admin token not configured on server' });
    }
    if (!token || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ message: 'Unauthorized' });
    next();
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// API: participants (protected)
app.get('/admin/participants.json', requireAdmin, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM participants ORDER BY id DESC').all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ message: 'DB read error' });
    }
});

// Duplicate API under /api/admin to avoid conflicts with static /admin/*
app.get('/api/admin/participants', requireAdmin, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM participants ORDER BY id DESC').all();
        res.json(rows);
    } catch (e) {
        res.status(500).json({ message: 'DB read error' });
    }
});

// API: stats
app.get('/admin/stats.json', requireAdmin, (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as c FROM participants').get().c;
        const recent = db.prepare('SELECT * FROM participants ORDER BY id DESC LIMIT 5').all();
        res.json({ total, recent });
    } catch (e) {
        res.status(500).json({ message: 'DB read error' });
    }
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as c FROM participants').get().c;
        const recent = db.prepare('SELECT * FROM participants ORDER BY id DESC LIMIT 5').all();
        res.json({ total, recent });
    } catch (e) {
        res.status(500).json({ message: 'DB read error' });
    }
});

// Problems API (public read, admin write)
const problemsFile = path.join(DATA_DIR, 'problems.json');
app.get('/api/problems', (req, res) => {
    try {
        if (!fs.existsSync(problemsFile)) return res.json([]);
        const data = fs.readFileSync(problemsFile, 'utf8');
        res.type('json').send(data);
    } catch (e) {
        res.status(500).json({ message: 'Could not read problems' });
    }
});

app.post('/api/problems', requireAdmin, express.json(), (req, res) => {
    try {
        const arr = req.body;
        // Ensure problems file directory exists in DATA_DIR
        fs.mkdirSync(path.dirname(problemsFile), { recursive: true });
        fs.writeFileSync(problemsFile, JSON.stringify(arr, null, 2), 'utf8');
        res.json({ message: 'OK' });
    } catch (e) {
        res.status(500).json({ message: 'Could not write problems' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    const msg = `🚀 Server running on http://localhost:${PORT}`;
    console.log(msg);
    logLine('Server started', { port: PORT });
});
