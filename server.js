/* =========================================================
   DAILY HELPER - server.js
   Ini "otak" utama Daily Helper. Jalan terus di server,
   bukan di HP kamu, sehingga bisa kirim notifikasi kapan
   saja walau Daily Helper sedang tidak dibuka.
========================================================= */

require('dotenv').config();

const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- CEK VAPID KEYS ----------
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('\n[STOP] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diisi di environment variables.\n');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ---------- TEMPAT MENYIMPAN DATA (file JSON sederhana) ----------
const DATA_DIR = path.join(__dirname, 'data');
const SUB_FILE = path.join(DATA_DIR, 'subscriptions.json');
const REMINDER_FILE = path.join(DATA_DIR, 'reminders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SUB_FILE)) fs.writeFileSync(SUB_FILE, '[]');
if (!fs.existsSync(REMINDER_FILE)) fs.writeFileSync(REMINDER_FILE, '[]');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch (e) { return []; }
}
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

let subscriptions = readJson(SUB_FILE);
let reminders = readJson(REMINDER_FILE);

function saveSubscriptions() { writeJson(SUB_FILE, subscriptions); }
function saveReminders() { writeJson(REMINDER_FILE, reminders); }

// ---------- SIAPKAN EXPRESS ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint || !sub.keys) {
    return res.status(400).json({ error: 'Data subscription tidak valid.' });
  }
  const idx = subscriptions.findIndex(s => s.endpoint === sub.endpoint);
  const record = { endpoint: sub.endpoint, keys: sub.keys, createdAt: Date.now() };
  if (idx >= 0) subscriptions[idx] = record; else subscriptions.push(record);
  saveSubscriptions();
  res.status(201).json({ success: true });
});

app.delete('/api/subscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint wajib diisi.' });
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  saveSubscriptions();
  reminders = reminders.filter(r => !(r.endpoint === endpoint && !r.sentAt));
  saveReminders();
  res.json({ success: true });
});

app.post('/api/reminder', (req, res) => {
  const { endpoint, judul, tanggal, jam, pesan } = req.body || {};
  if (!endpoint || !judul || !tanggal || !jam) {
    return res.status(400).json({ error: 'Data pengingat belum lengkap.' });
  }
  const subExists = subscriptions.some(s => s.endpoint === endpoint);
  if (!subExists) {
    return res.status(404).json({ error: 'Aktifkan notifikasi dulu sebelum membuat pengingat.' });
  }
  const reminder = {
    id: crypto.randomUUID(),
    endpoint, judul, tanggal, jam,
    pesan: pesan || `Jangan lupa: ${judul}`,
    sentAt: null,
    createdAt: Date.now()
  };
  reminders.push(reminder);
  saveReminders();
  res.status(201).json({ success: true, reminder });
});

app.get('/api/reminders', (req, res) => {
  const { endpoint } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'endpoint wajib diisi.' });
  const list = reminders.filter(r => r.endpoint === endpoint);
  res.json({ reminders: list });
});

app.delete('/api/reminder/:id', (req, res) => {
  const before = reminders.length;
  reminders = reminders.filter(r => r.id !== req.params.id);
  saveReminders();
  if (reminders.length === before) return res.status(404).json({ error: 'Tidak ditemukan.' });
  res.json({ success: true });
});

// ---------- PENJAGA WAKTU: cek tiap 20 detik, kirim push kalau sudah waktunya ----------
async function checkAndSendReminders() {
  const now = Date.now();
  const due = reminders.filter(r => !r.sentAt && new Date(`${r.tanggal}T${r.jam}:00+07:00`).getTime() <= now);
  if (due.length === 0) return;

  for (const reminder of due) {
    const sub = subscriptions.find(s => s.endpoint === reminder.endpoint);
    if (!sub) { reminder.sentAt = now; continue; }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title: '🔔 Daily Helper', body: reminder.pesan, url: '/' })
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
        saveSubscriptions();
      }
      console.error('Gagal kirim notifikasi:', err.message);
    }
    reminder.sentAt = Date.now();
  }
  saveReminders();
}
setInterval(checkAndSendReminders, 20 * 1000);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Daily Helper jalan di port ${PORT}`);
});