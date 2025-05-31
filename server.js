const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/public', express.static('public'));
app.use('/uploads', express.static('uploads'));

// Multer для загрузки файлов
const upload = multer({ dest: 'uploads/' });

// Загрузка базы пользователей
const users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'));

// Middleware авторизации
function authMiddleware(req, res, next) {
  const username = req.cookies.username;
  if (!username || !users[username]) {
    return res.redirect('/public/login.html');
  }
  req.user = users[username];
  next();
}

// Страница входа
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  if (!user || user.password !== password) {
    return res.status(401).send('❌ Неверный логин или пароль');
  }

  res.cookie('username', username, { httpOnly: true });
  res.redirect('/public/admin.html');
});

// Выход
app.get('/logout', (_, res) => {
  res.clearCookie('username');
  res.redirect('/public/login.html');
});

// Проверка прав доступа к API
app.post('/api/save-artist', authMiddleware, upload.fields([
  { name: 'artistPhoto' },
  { name: 'background' },
  { name: 'customFont' }
]), (req, res) => {
  const data = req.body;
  const files = req.files;

  const artistId = req.user.role === 'admin' ? data.artistId : req.user.artistId;
  const savePath = `./uploads/${artistId}`;
  if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });

  // Сохраняем текстовые данные
  fs.writeFileSync(`${savePath}/data.json`, JSON.stringify(data, null, 2));

  // Сохраняем файлы
  for (const field in files) {
    const file = files[field][0];
    const ext = path.extname(file.originalname);
    fs.renameSync(file.path, `${savePath}/${field}${ext}`);
  }

  res.send('✅ Данные сохранены');
});

app.listen(PORT, () => {
  console.log(`🔐 Сервер запущен на http://localhost:${PORT}`);
});

