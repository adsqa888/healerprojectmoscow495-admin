// Обновлённый server.js с автоматическим созданием страницы артиста на FTP

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const ftp = require('basic-ftp');
const bodyParser = require('body-parser');

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const ARTISTS_FILE = path.join(__dirname, 'artists.json');

function saveArtistData(id, data) {
  let allData = {};
  if (fs.existsSync(ARTISTS_FILE)) {
    allData = JSON.parse(fs.readFileSync(ARTISTS_FILE));
  }
  allData[id] = data;
  fs.writeFileSync(ARTISTS_FILE, JSON.stringify(allData, null, 2));
}

async function uploadTemplateToFTP(artistId) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false,
      port: 21,
    });

    const folderPath = `${process.env.FTP_BASE}${artistId}`;
    await client.ensureDir(folderPath);
    await client.cd(folderPath);

    const indexPath = path.join(__dirname, 'public', 'artist-template.html');
    await client.uploadFrom(indexPath, 'index.html');

    console.log(`✅ Страница артиста ${artistId} загружена на FTP`);
  } catch (err) {
    console.error('FTP Error:', err);
  }
  client.close();
}

app.post('/api/create-artist', async (req, res) => {
  const { id, artistName, about, photo, youtube, instagram, vk, telegram, yandex, releaseEmbed, videoEmbed, background, customFont } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing artist ID' });

  const artistData = {
    artistName,
    about,
    photo,
    youtube,
    instagram,
    vk,
    telegram,
    yandex,
    releaseEmbed,
    videoEmbed,
    background,
    customFont,
  };

  saveArtistData(id, artistData);
  await uploadTemplateToFTP(id);

  res.json({ success: true, message: `Artist ${id} created.` });
});

app.get('/api/artist-data', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'No id provided' });

  if (!fs.existsSync(ARTISTS_FILE)) return res.status(404).json({ error: 'No data file' });

  const allData = JSON.parse(fs.readFileSync(ARTISTS_FILE));
  if (!allData[id]) return res.status(404).json({ error: 'Artist not found' });

  res.json(allData[id]);
});

app.listen(process.env.PORT || 10000, () => {
  console.log('✅ Сервер запущен');
});
