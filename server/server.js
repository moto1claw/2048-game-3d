import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 4000;

const DATA_FILE = join(__dirname, 'data.json');

function loadData() {
  if (existsSync(DATA_FILE)) {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  }
  return { users: [], games: [], leaderboard: [] };
}

function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

app.use(cors());
app.use(express.json());

function getUser(userId) {
  return data.users.find(u => u.id === userId);
}

function findUser(username) {
  return data.users.find(u => u.username === username);
}

function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

// 注册
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' });
  }
  
  if (findUser(username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  
  const user = {
    id: generateId(),
    username,
    password,
    createdAt: new Date().toISOString()
  };
  
  data.users.push(user);
  saveData(data);
  
  res.json({ token: user.id, username });
});

// 登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = findUser(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  res.json({ token: user.id, username: user.username });
});

// 获取关卡列表
app.get('/api/game/levels', (req, res) => {
  const levels = [
    { id: 0, name: '古墓遗迹', target: 256, moves: 30, theme: 'ancient' },
    { id: 1, name: '深海漩涡', target: 512, moves: 35, theme: 'ocean' },
    { id: 2, name: '星际战场', target: 1024, moves: 40, theme: 'space' },
    { id: 3, name: '赛博都市', target: 2048, moves: 45, theme: 'cyber' },
  ];
  res.json(levels);
});

// 结束游戏
app.post('/api/game/end', (req, res) => {
  const { level, score, moves, won } = req.body;
  const userId = req.headers.authorization;
  
  if (userId) {
    const user = getUser(userId);
    const username = user?.username || '匿名';
    
    data.games.push({
      id: generateId(),
      userId,
      username,
      level,
      score,
      moves,
      won,
      createdAt: new Date().toISOString()
    });
    
    data.leaderboard.push({
      id: generateId(),
      userId,
      username,
      level,
      score,
      createdAt: new Date().toISOString()
    });
    
    saveData(data);
  }
  
  res.json({ success: true });
});

// 获取排行榜
app.get('/api/leaderboard', (req, res) => {
  const { level, limit = 10 } = req.query;
  
  let leaderboard = [...data.leaderboard];
  
  if (level !== undefined) {
    leaderboard = leaderboard.filter(e => e.level === parseInt(level));
  }
  
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, parseInt(limit));
  
  res.json(leaderboard);
});

app.listen(PORT, () => {
  console.log(`🎮 2048 3D Server running on http://localhost:${PORT}`);
});
