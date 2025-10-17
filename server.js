import express from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'mySuperSecret123!';

// File path
const LEVELS_FILE = path.join(__dirname, 'levels.json');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Helper functions ---
function readLevels() {
  const data = fs.existsSync(LEVELS_FILE) ? fs.readFileSync(LEVELS_FILE) : '[]';
  return JSON.parse(data);
}

function writeLevels(levels) {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

// --- API Routes ---
// Get all levels
app.get('/api/levels', (req, res) => {
  const levels = readLevels();
  res.json(levels);
});

// Login (fake username/password)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '1234') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid username/password' });
  }
});

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Update a level (edit)
app.put('/api/levels/:rank', verifyToken, (req, res) => {
  const levels = readLevels();
  const rank = parseInt(req.params.rank);
  const index = levels.findIndex(l => l.rank === rank);
  if (index === -1) return res.status(404).json({ error: 'Level not found' });

  const { newRank, title, creator, youtube, recordHolders } = req.body;

  // Update level info
  levels[index].title = title;
  levels[index].creator = creator;
  levels[index].youtube = youtube;
  levels[index].recordHolders = recordHolders;

  // Swap ranks if changed
  if (newRank && newRank !== rank) {
    const targetIndex = levels.findIndex(l => l.rank === newRank);
    if (targetIndex !== -1) levels[targetIndex].rank = rank;
    levels[index].rank = newRank;
  }

  // Sort and normalize ranks
  levels.sort((a, b) => a.rank - b.rank);
  levels.forEach((l, i) => l.rank = i + 1);

  writeLevels(levels);
  res.json(levels);
});

// Create new level
app.post('/api/levels', verifyToken, (req, res) => {
  const levels = readLevels();
  const { title = 'New Level', creator = '', youtube = '', recordHolders = [] } = req.body;
  const newLevel = { rank: levels.length + 1, title, creator, youtube, recordHolders };
  levels.push(newLevel);
  writeLevels(levels);
  res.json(newLevel);
});

// Delete level
app.delete('/api/levels/:rank', verifyToken, (req, res) => {
  let levels = readLevels();
  const rank = parseInt(req.params.rank);
  levels = levels.filter(l => l.rank !== rank);
  // Reassign ranks
  levels.sort((a, b) => a.rank - b.rank);
  levels.forEach((l, i) => l.rank = i + 1);
  writeLevels(levels);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
