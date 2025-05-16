// server.js
require('dotenv').config();           // 1. Load .env
const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const bcrypt     = require('bcryptjs');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Read secrets
const SESSION_SECRET = process.env.SESSION_SECRET;
const ADMIN_HASH     = process.env.ADMIN_HASH;

// 3. Point DATA_FILE at the writable tmpdir
const DATA_FILE = path.join(os.tmpdir(), 'data.json');

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// 4. Safe load/save
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch (e) {
    console.error('⚠️ loadData failed:', e);
    return [];
  }
}
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('⚠️ saveData failed (ephemeral?):', e);
  }
}

// 5. Main page
app.get('/', (req, res) => {
  res.render('main', { message: null });
});
app.post('/', (req, res) => {
  const { name, price } = req.body;
  const date = new Date().toISOString().slice(0,10);
  const all  = loadData();
  all.push({ name, price, date });
  saveData(all);
  res.render('main', { message: 'ส่งข้อมูลเรียบร้อยแล้ว 😊' });
});

// 6. Login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (bcrypt.compareSync(password, ADMIN_HASH)) {
    req.session.user = 'admin';
    return res.redirect('/result');
  }
  res.render('login', { error: 'รหัสผ่านไม่ถูกต้อง' });
});

// 7. Protected middleware
function requireAdmin(req, res, next) {
  if (req.session.user === 'admin') return next();
  res.redirect('/login');
}

// 8. Result page
app.get('/result', requireAdmin, (req, res) => {
  const all     = loadData();
  const now     = new Date();
  const isoDate = now.toISOString().slice(0,10);

  const dd = String(now.getDate()).padStart(2,'0');
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const yyyy = now.getFullYear();
  const displayDate = `${dd}/${mm}/${yyyy}`;

  const todays = all.filter(x => x.date === isoDate);
  res.render('result', { data: todays, displayDate });
});

// 9. Export for Vercel
// สตาร์ท server
const PORT = 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
module.exports = app;
