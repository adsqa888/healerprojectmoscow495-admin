const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(cookieParser());

// 🔒 Защита всех страниц кроме логина и API
app.use((req, res, next) => {
  const publicPaths = ['/login.html', '/', '/login', '/api/me'];
  const isApi = req.path.startsWith('/api/');
  const isStatic = req.path.startsWith('/uploads/') || req.path.startsWith('/icons/');

  const isPublic = publicPaths.includes(req.path) || isApi || isStatic;
  const user = users[req.cookies.user];

  if (isPublic || user) {
    next();
  } else {
    res.redirect('/login.html');
  }
});

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 10000;

const users = {
  alexey: { password: 'drippin', role: 'admin' },
  healer: { password: 'healerpass', role: 'artist' }
};

app.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    res.cookie('user', username, { httpOnly: true });
    res.redirect('/admin.html');
  } else {
    res.send('Неверный логин или пароль');
  }
});

app.get('/api/artists', (req, res) => {
  const artists = Object.keys(users).filter(u => users[u].role === 'artist');
  res.json(artists);
});

app.get('/api/artist-data', (req, res) => {
  const artistId = req.query.id;
  const filePath = path.join(__dirname, 'uploads', artistId, 'data.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    res.json(JSON.parse(data));
  } else {
    res.json({});
  }
});

app.get('/api/me', (req, res) => {
  const username = req.cookies.user;
  const user = users[username];
  if (user) {
    res.json({ username, role: user.role });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/save-artist', upload.fields([
  { name: 'artistPhoto' }, 
  { name: 'background' },
  { name: 'customFont' }
]), (req, res) => {
  const artistId = req.body.artistId;
  const artistDir = path.join(__dirname, 'uploads', artistId);
  if (!fs.existsSync(artistDir)) fs.mkdirSync(artistDir, { recursive: true });

  const dataPath = path.join(artistDir, 'data.json');
  let currentData = {};
  if (fs.existsSync(dataPath)) {
    currentData = JSON.parse(fs.readFileSync(dataPath));
  }

  const fieldsToUpdate = [
    'artistName', 'about', 'youtube', 'instagram',
    'vk', 'yandex', 'telegram', 'releaseEmbed', 'videoEmbed'
  ];
  fieldsToUpdate.forEach(field => {
    if (req.body[field]) currentData[field] = req.body[field];
  });

  const fileMap = {
    artistPhoto: 'photo',
    background: 'background',
    customFont: 'font'
  };

  for (const field in fileMap) {
    if (req.files[field]) {
      const file = req.files[field][0];
      const ext = path.extname(file.originalname);
      const target = path.join(artistDir, `${fileMap[field]}${ext}`);
      fs.renameSync(file.path, target);
      currentData[field] = `/uploads/${artistId}/${fileMap[field]}${ext}`;
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));
  res.send('ok');
});

app.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log(`🔐 Сервер запущен на http://localhost:${PORT}`);
});
