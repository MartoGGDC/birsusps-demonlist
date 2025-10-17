import express from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key'; // set in Render

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const levelsFile = path.join(__dirname, 'levels.json');

/* ---------- Auth ---------- */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '1234') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

/* ---------- Levels API ---------- */
app.get('/api/levels', (req, res) => {
  const data = JSON.parse(fs.readFileSync(levelsFile, 'utf8'));
  res.json(data);
});

app.post('/api/levels', authMiddleware, (req, res) => {
  const data = JSON.parse(fs.readFileSync(levelsFile, 'utf8'));
  const newLevel = req.body;
  newLevel.rank = data.length + 1;
  data.push(newLevel);
  fs.writeFileSync(levelsFile, JSON.stringify(data, null, 2));
  res.json(newLevel);
});

app.put('/api/levels/:rank', authMiddleware, (req, res) => {
  const data = JSON.parse(fs.readFileSync(levelsFile, 'utf8'));
  const rank = parseInt(req.params.rank);
  const index = data.findIndex(l => l.rank === rank);
  if (index === -1) return res.status(404).json({ message: 'Level not found' });

  const updated = req.body;

  // Swap ranks if necessary
  if (updated.rank && updated.rank !== rank) {
    const swapIndex = data.findIndex(l => l.rank === updated.rank);
    if (swapIndex !== -1) data[swapIndex].rank = rank;
  }

  data[index] = { ...data[index], ...updated };
  data.sort((a,b) => a.rank - b.rank);
  fs.writeFileSync(levelsFile, JSON.stringify(data, null, 2));
  res.json(data[index]);
});

app.delete('/api/levels/:rank', authMiddleware, (req, res) => {
  const data = JSON.parse(fs.readFileSync(levelsFile, 'utf8'));
  const rank = parseInt(req.params.rank);
  const index = data.findIndex(l => l.rank === rank);
  if (index === -1) return res.status(404).json({ message: 'Level not found' });

  data.splice(index, 1);
  data.forEach((l,i)=>l.rank=i+1);
  fs.writeFileSync(levelsFile, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

/* ---------- Start Server ---------- */
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
