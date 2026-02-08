const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

const app = express();

// --- 1. إعداد MongoDB (مع إضافة خيارات استقرار الاتصال) ---
const MONGO_URI = "mongodb+srv://kadersghir23_db_user:lx7jm7RhOs2obPff@cluster0.tfsweyh.mongodb.net/?appName=Cluster0"; 

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // تقليل وقت الانتظار للفشل السريع بدلاً من التعليق
})
.then(() => console.log("✅ Connected to MongoDB Atlas"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

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

// --- 3. النماذج ---
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number, title: String, priceUSD: String, priceDZ: String,
    players: String, linkType: String, imgs: [String]
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String, mediationLink: String, sellAccountLink: String,
    buyNowLink: String, announcement: String, themeColor: String
}));

// --- 4. الإعدادات ---
app.use(session({ secret: 'wassit_secure_key', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname);

// --- 5. المسارات ---
app.get('/', async (req, res) => {
    try {
        const accounts = await Account.find();
        let settings = await Settings.findOne() || await Settings.create({
            supportLink: "#", mediationLink: "#", sellAccountLink: "#", 
            buyNowLink: "#", announcement: "مرحباً بكم في WassitDZ", themeColor: "#2563eb"
        });
        res.render('index', { accounts, settings });
    } catch (err) {
        res.status(500).send("خطأ في الاتصال بقاعدة البيانات. تأكد من إعدادات IP في MongoDB Atlas.");
    }
});

app.get('/admin-panel', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    const accounts = await Account.find();
    const settings = await Settings.findOne();
    res.render('admin', { accounts, settings });
});

app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    try {
        const imagePaths = req.files.map(file => file.path);
        await Account.create({
            id: Math.floor(1000 + Math.random() * 9000),
            title: req.body.title, priceUSD: req.body.priceUSD, priceDZ: req.body.priceDZ,
            players: req.body.players, linkType: req.body.linkType, imgs: imagePaths
        });
        res.redirect('/admin-panel');
    } catch (err) { res.send("خطأ في رفع البيانات"); }
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
    } else { res.send("بيانات خاطئة"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
