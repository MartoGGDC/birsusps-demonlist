import express from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const levelsFile = path.join(process.cwd(), 'levels.json');

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(username === 'admin' && password === '1234'){
    const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username/password' });
  }
});

// Get levels
app.get('/levels', (req, res) => {
  const data = JSON.parse(fs.readFileSync(levelsFile, 'utf-8'));
  res.json(data);
});

// Save levels (requires JWT)
app.post('/levels', (req, res) => {
  const authHeader = req.headers['authorization'];
  if(!authHeader) return res.status(401).json({ success: false, message: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, SECRET);
    fs.writeFileSync(levelsFile, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch(err) {
    res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
