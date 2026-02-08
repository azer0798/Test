const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

const app = express();

// --- 1. إعداد MongoDB Atlas ---
const MONGO_URI = "mongodb+srv://kadersghir23_db_user:lx7jm7RhOs2obPff@cluster0.tfsweyh.mongodb.net/?appName=Cluster0"; 
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.log("❌ MongoDB Error:", err));

// --- 2. إعداد Cloudinary ---
cloudinary.config({ 
  cloud_name: 'dyaiiu0if', 
  api_key: '472796885733631', 
  api_secret: 'XrclBC-P-bx-bC2dynefS-KnR_I' 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wassitdz_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});
const upload = multer({ storage: storage });

// --- 3. نماذج البيانات (Models) ---
const Account = mongoose.model('Account', {
    id: Number, title: String, priceUSD: String, priceDZ: String,
    players: String, linkType: String, imgs: [String]
});

const Settings = mongoose.model('Settings', {
    supportLink: String, mediationLink: String, sellAccountLink: String,
    buyNowLink: String, announcement: String, themeColor: String
});

// --- 4. إعدادات Express ---
app.use(session({ secret: 'dz_secret_key_2026', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname);

// --- 5. المسارات (Routes) ---

app.get('/', async (req, res) => {
    const accounts = await Account.find();
    let settings = await Settings.findOne() || await Settings.create({
        supportLink: "#", mediationLink: "#", sellAccountLink: "#", 
        buyNowLink: "#", announcement: "مرحباً بكم في WassitDZ", themeColor: "#2563eb"
    });
    res.render('index', { accounts, settings });
});

app.get('/admin-panel', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    const accounts = await Account.find();
    const settings = await Settings.findOne();
    res.render('admin', { accounts, settings });
});

app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    const imagePaths = req.files.map(file => file.path);
    await Account.create({
        id: Math.floor(1000 + Math.random() * 9000),
        title: req.body.title, priceUSD: req.body.priceUSD, priceDZ: req.body.priceDZ,
        players: req.body.players, linkType: req.body.linkType, imgs: imagePaths
    });
    res.redirect('/admin-panel');
});

app.post('/update-settings', async (req, res) => {
    await Settings.findOneAndUpdate({}, req.body);
    res.redirect('/admin-panel');
});

app.get('/delete/:id', async (req, res) => {
    await Account.findOneAndDelete({ id: req.params.id });
    res.redirect('/admin-panel');
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    if (req.body.username === "admin" && req.body.password === "pes2026") {
        req.session.isAdmin = true;
        res.redirect('/admin-panel');
    } else { res.send("خطأ في الدخول"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Live on port ${PORT}`));
