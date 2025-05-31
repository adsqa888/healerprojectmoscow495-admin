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
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 10000;

// 🔐 Простейшая авторизация по cookie (упрощённо)
const users = {
  alexey: { password: 'drippin', role: 'admin' },
  healer: { password: 'healerpass', role: 'artist' }
};

// ⬇️ Авторизация
app.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    res.cookie('user', username, { httpOnly: true });
    res.redirect('/public/admin.html');
  } else {
    res.send('Неверный логин или пароль');
  }
});

// 📄 Получить список артистов
app.get('/api/artists', (req, res) => {
  const artists = Object.keys(users).filter(u => users[u].role === 'artist');
  res.json(artists);
});

// 📄 Получить данные артиста
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

// 💾 Сохранить данные артиста
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

  // Обновляем поля только если они пришли
  const fieldsToUpdate = [
    'artistName', 'about', 'youtube', 'instagram',
    'vk', 'yandex', 'telegram', 'releaseEmbed', 'videoEmbed'
  ];
  fieldsToUpdate.forEach(field => {
    if (req.body[field]) currentData[field] = req.body[field];
  });

  // Файлы
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

// 🧼 Выйти
app.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.redirect('/public/login.html');
});

// ▶️ Запуск сервера
app.listen(PORT, () => {
  console.log(`🔐 Сервер запущен на http://localhost:${PORT}`);
});
