import express from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 10000;

// --- File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEVELS_FILE = path.join(__dirname, 'levels.json');

// --- JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'mySuperSecret123!';

// --- Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// --- Helpers
function readLevels() {
  if (!fs.existsSync(LEVELS_FILE)) fs.writeFileSync(LEVELS_FILE, JSON.stringify([]));
  const data = fs.readFileSync(LEVELS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeLevels(levels) {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if(!authHeader) return res.status(401).json({ message:'No token provided' });
  const token = authHeader.split(' ')[1];
  if(!token) return res.status(401).json({ message:'Invalid token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch(err) {
    return res.status(401).json({ message:'Invalid token' });
  }
}

// --- Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // CHANGE THESE CREDENTIALS
  if(username === 'admin' && password === '1234') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token });
  }
  res.status(401).json({ message:'Invalid credentials' });
});

app.get('/api/levels', (req, res) => {
  const levels = readLevels();
  res.json(levels);
});

app.post('/api/levels', authMiddleware, (req, res) => {
  const levels = readLevels();
  const newLevel = req.body;
  // Assign rank to end
  newLevel.rank = levels.length + 1;
  newLevel.recordHolders = [];
  levels.push(newLevel);
  writeLevels(levels);
  res.json(newLevel);
});

app.put('/api/levels/:rank', authMiddleware, (req, res) => {
  const levels = readLevels();
  const rank = parseInt(req.params.rank);
  const index = levels.findIndex(l => l.rank === rank);
  if(index === -1) return res.status(404).json({ message:'Level not found' });

  const updatedLevel = req.body;
  const oldRank = levels[index].rank;
  const newRank = updatedLevel.rank;

  // Swap ranks if needed
  if(newRank !== oldRank){
    const targetIndex = levels.findIndex(l => l.rank === newRank);
    if(targetIndex !== -1) levels[targetIndex].rank = oldRank;
  }

  levels[index] = { ...updatedLevel };
  levels.sort((a,b)=>a.rank - b.rank);
  writeLevels(levels);
  res.json(levels[index]);
});

app.delete('/api/levels/:rank', authMiddleware, (req, res) => {
  let levels = readLevels();
  const rank = parseInt(req.params.rank);
  const index = levels.findIndex(l => l.rank === rank);
  if(index === -1) return res.status(404).json({ message:'Level not found' });

  levels.splice(index,1);
  // Reassign ranks
  levels.forEach((l,i)=>l.rank = i+1);
  writeLevels(levels);
  res.json({ message:'Deleted' });
});

// Serve front-end
app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname,'index.html'));
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
