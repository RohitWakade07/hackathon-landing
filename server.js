const express = require("express");
const fs = require("fs");
const xlsx = require("xlsx");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");

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

app.post("/submit", upload.single('ppt'), (req, res) => {
    try {
        let workbook, sheet;

        if (fs.existsSync(filePath)) {
            workbook = xlsx.readFile(filePath);
            sheet = workbook.Sheets["Participants"];
        } else {
            workbook = xlsx.utils.book_new();
            sheet = xlsx.utils.aoa_to_sheet([[
                "Team Name",
                "Team Size",
                "Leader Name",
                "Phone",
                "Email",
                "College",
                "Year",
                "Track",
                "GitHub / Portfolio",
                "Experience",
                "Members",
                "Project Idea",
                "Agree",
                "Consent",
                "Timestamp"
            ]]);
            xlsx.utils.book_append_sheet(workbook, sheet, "Participants");
        }

        const data = xlsx.utils.sheet_to_json(sheet);
        // push new entry
        const entry = {
            "Team Name": req.body.teamName || "",
            "Team Size": req.body.teamSize || "",
            "Leader Name": req.body.name || "",
            "Phone": req.body.phone || "",
            "Email": req.body.email || "",
            "College": req.body.college || "",
            "Year": req.body.year || "",
            "Track": req.body.track || "",
            "GitHub / Portfolio": req.body.github || "",
            "Experience": req.body.experience || "",
            "Members": req.body.members || "",
            "Project Idea": req.body.projectIdea || "",
            "Agree": req.body.agree ? "Yes" : "No",
            "Consent": req.body.consent ? "Yes" : "No",
            "PPT Path": req.file ? path.relative(__dirname, req.file.path) : "",
            "Timestamp": new Date().toISOString()
        };
        data.push(entry);

        const newSheet = xlsx.utils.json_to_sheet(data);
        workbook.Sheets["Participants"] = newSheet;
        xlsx.writeFile(workbook, filePath);

        console.log("📥 New Registration:", entry);
        res.json({ message: "✅ Registration Successful!" });
    } catch (err) {
        console.error("Error saving registration:", err);
        res.status(500).json({ message: "❌ Server error. Could not save registration." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
