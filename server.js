import express from "express";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "mySuperSecret123!";

const __dirname = path.resolve();
const LEVELS_PATH = path.join(__dirname, "levels.json");

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

/* ------------------ Helper Functions ------------------ */
function loadLevels() {
  try {
    const data = fs.readFileSync(LEVELS_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading levels.json:", err);
    return [];
  }
}

function saveLevels(levels) {
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2), "utf8");
}

/* ------------------ Authentication ------------------ */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || "MartoGG";
  const adminPass = process.env.ADMIN_PASS || "Ilovebirsusps";

  if (username === adminUser && password === adminPass) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1d" });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(403).json({ message: "No authorization header" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(403).json({ message: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

/* ------------------ API Endpoints ------------------ */

// Get all levels
app.get("/api/levels", (req, res) => {
  const levels = loadLevels();
  res.json(levels);
});

// Update or swap levels
app.post("/api/levels/update", verifyToken, (req, res) => {
  const updated = req.body;
  if (!updated || typeof updated.rank !== "number")
    return res.status(400).json({ message: "Invalid data" });

  let levels = loadLevels();
  const oldLevelIndex = levels.findIndex(
    (lvl) => lvl.rank === updated.originalRank
  );
  if (oldLevelIndex === -1)
    return res.status(404).json({ message: "Level not found" });

  const targetLevelIndex = levels.findIndex(
    (lvl) => lvl.rank === updated.rank
  );

  if (targetLevelIndex !== -1 && targetLevelIndex !== oldLevelIndex) {
    // Swap ranks between the two levels
    const tempRank = levels[targetLevelIndex].rank;
    levels[targetLevelIndex].rank = levels[oldLevelIndex].rank;
    levels[oldLevelIndex].rank = tempRank;

    // Swap objects to maintain proper ordering
    const tempLevel = levels[targetLevelIndex];
    levels[targetLevelIndex] = levels[oldLevelIndex];
    levels[oldLevelIndex] = tempLevel;
  } else {
    // Just update properties (like name, creator, etc.)
    levels[oldLevelIndex] = { ...levels[oldLevelIndex], ...updated };
  }

  // Sort by rank to ensure proper order
  levels.sort((a, b) => a.rank - b.rank);

  saveLevels(levels);
  res.json({ message: "Level updated", levels });
});

// Delete a level
app.post("/api/levels/delete", verifyToken, (req, res) => {
  const { rank } = req.body;
  if (typeof rank !== "number")
    return res.status(400).json({ message: "Invalid rank" });

  let levels = loadLevels();
  levels = levels.filter((lvl) => lvl.rank !== rank);
  saveLevels(levels);
  res.json({ message: "Level deleted", levels });
});

// Create a new level
app.post("/api/levels/create", verifyToken, (req, res) => {
  let levels = loadLevels();
  const maxRank = levels.reduce((max, l) => Math.max(max, l.rank), 0);
  const newLevel = {
    rank: maxRank + 1,
    title: "Untitled Level",
    creator: "Unknown",
    youtube: "",
    recordHolders: [],
  };
  levels.push(newLevel);
  saveLevels(levels);
  res.json({ message: "Level created", level: newLevel });
});

/* ------------------ Serve Frontend ------------------ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ------------------ Start Server ------------------ */
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
