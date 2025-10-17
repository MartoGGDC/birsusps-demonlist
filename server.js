import express from "express";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 10000;

// JWT secret from Render environment variable
const JWT_SECRET = process.env.JWT_SECRET || "mySuperSecret123!";

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Helper to read/write levels.json
const levelsPath = path.join(__dirname, "levels.json");

function readLevels() {
  if (!fs.existsSync(levelsPath)) return [];
  const data = fs.readFileSync(levelsPath, "utf-8");
  return JSON.parse(data);
}

function writeLevels(levels) {
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2), "utf-8");
}

// ---------- Routes ---------- //

// Get all levels
app.get("/api/levels", (req, res) => {
  const levels = readLevels();
  res.json(levels);
});

// Update a level (requires login)
app.post("/api/levels/update", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { rank, title, creator, youtube, recordHolders } = req.body;
  let levels = readLevels();

  const index = levels.findIndex((l) => l.rank === rank);
  if (index !== -1) {
    levels[index] = { ...levels[index], title, creator, youtube, recordHolders };
  } else {
    levels.push({ rank, title, creator, youtube, recordHolders });
  }

  // Sort levels by rank
  levels.sort((a, b) => a.rank - b.rank);
  writeLevels(levels);
  res.json({ success: true });
});

// Delete a level (requires login)
app.post("/api/levels/delete", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { rank } = req.body;
  let levels = readLevels();
  levels = levels.filter((l) => l.rank !== rank);

  // Reassign ranks
  levels.sort((a, b) => a.rank - b.rank);
  levels.forEach((l, i) => (l.rank = i + 1));

  writeLevels(levels);
  res.json({ success: true });
});

// Login route
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  // Hardcoded for now, can later expand to DB
  if (username === "admin" && password === "1234") {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "8h" });
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// Fallback to serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
