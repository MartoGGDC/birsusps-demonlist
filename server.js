import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const LEVELS_FILE = path.join(__dirname, "levels.json");

// Load levels from file
function loadLevels() {
  if (!fs.existsSync(LEVELS_FILE)) {
    fs.writeFileSync(LEVELS_FILE, "[]", "utf8");
  }
  return JSON.parse(fs.readFileSync(LEVELS_FILE, "utf8"));
}

// Save levels to file
function saveLevels(levels) {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2), "utf8");
}

// API routes
app.get("/api/levels", (req, res) => {
  res.json(loadLevels());
});

app.post("/api/levels", (req, res) => {
  const levels = loadLevels();
  levels.push(req.body);
  saveLevels(levels);
  res.json({ success: true });
});

app.put("/api/levels/:rank", (req, res) => {
  const rank = parseInt(req.params.rank);
  let levels = loadLevels();
  const idx = levels.findIndex((l) => l.rank === rank);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  levels[idx] = req.body;
  saveLevels(levels);
  res.json({ success: true });
});

app.delete("/api/levels/:rank", (req, res) => {
  const rank = parseInt(req.params.rank);
  let levels = loadLevels().filter((l) => l.rank !== rank);
  // Reassign ranks
  levels.sort((a, b) => a.rank - b.rank);
  levels.forEach((l, i) => (l.rank = i + 1));
  saveLevels(levels);
  res.json({ success: true });
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
