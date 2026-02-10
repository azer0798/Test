require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const axios = require('axios');

const app = express();

// --- إعدادات رفع البيانات الكبيرة ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- الاتصال بقاعدة البيانات ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// --- إعداد Cloudinary ---
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'wassitdz_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const upload = multer({ storage: storage });

// --- النماذج ---
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number, title: String, priceUSD: String, priceDZ: String,
    players: String, linkType: String, imgs: [String]
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String, mediationLink: String, sellAccountLink: String,
    buyNowLink: String, announcement: String, themeColor: String
}));

app.use(session({ 
    secret: process.env.SESSION_SECRET || 'wassit_secure', 
    resave: false, 
    saveUninitialized: true 
}));

app.set('view engine', 'ejs');
app.set('views', __dirname);

// --- ميزة الحفاظ على النشاط (Anti-Sleep) ---
const keepAlive = () => {
    const url = process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : null;
    if (url) {
        setInterval(() => {
            axios.get(url).then(() => console.log('Ping OK')).catch(e => console.log('Ping Fail'));
        }, 600000);
    }
};

// --- المسارات (Routes) ---

app.get('/', async (req, res) => {
    try {
        const accounts = await Account.find();
        let settings = await Settings.findOne() || await Settings.create({
            supportLink: "#", mediationLink: "#", sellAccountLink: "#", 
            buyNowLink: "#", announcement: "مرحباً بكم في WassitDZ", themeColor: "#2563eb"
        });
        res.render('index', { accounts, settings });
    } catch (err) { res.status(500).send("Database Error"); }
});

app.get('/admin-panel', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    const accounts = await Account.find();
    const settings = await Settings.findOne();
    res.render('admin', { accounts, settings });
});

// إضافة حساب جديد
app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Forbidden");
    try {
        const imagePaths = req.files.map(file => file.path);
        await Account.create({
            id: Math.floor(1000 + Math.random() * 9000),
            title: req.body.title, priceUSD: req.body.priceUSD, priceDZ: req.body.priceDZ,
            linkType: req.body.linkType, imgs: imagePaths
        });
        res.redirect('/admin-panel');
    } catch (err) { res.status(500).send("خطأ في رفع الصور أو البيانات"); }
});

// تحديث الإعدادات (إصلاح خطأ المسار)
app.post('/update-settings', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Forbidden");
    try {
        await Settings.findOneAndUpdate({}, req.body, { upsert: true });
        res.redirect('/admin-panel');
    } catch (err) { res.status(500).send("خطأ في حفظ الإعدادات"); }
});

app.get('/delete/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Forbidden");
    await Account.findOneAndDelete({ id: req.params.id });
    res.redirect('/admin-panel');
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    if (req.body.username === process.env.ADMIN_USER && req.body.password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect('/admin-panel');
    } else { res.send("<script>alert('خطأ'); window.location='/login';</script>"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Store Live on ${PORT}`);
    keepAlive();
});
