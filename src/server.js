const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");
const ExcelJS = require('exceljs');

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const filePath = path.join(__dirname, "data.xlsx");
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

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
        const allowed = ['.ppt', '.pptx', '.pdf'];
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (allowed.includes(ext)) return cb(null, true);
        cb(new Error('Invalid file type'));
    }
});

app.post("/submit", upload.single('ppt'), async (req, res) => {
    try {
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
            req.body.teamName || "",
            req.body.teamSize || "",
            req.body.name || "",
            req.body.phone || "",
            req.body.email || "",
            req.body.college || "",
            req.body.year || "",
            req.body.track || "",
            req.body.github || "",
            req.body.experience || "",
            req.body.members || "",
            req.body.projectIdea || "",
            req.body.agree ? "Yes" : "No",
            req.body.consent ? "Yes" : "No",
            req.file ? path.relative(__dirname, req.file.path) : "",
            new Date().toISOString()
        ]);
        await workbook.xlsx.writeFile(filePath);

        console.log("📥 New Registration:", req.body);
        res.json({ message: "✅ Registration Successful!" });
    } catch (err) {
        console.error("Error saving registration:", err);
        res.status(500).json({ message: "❌ Server error. Could not save registration." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
