require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();

// --- الإعدادات الأساسية ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', __dirname);

// --- الاتصال بقاعدة البيانات ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ تم الاتصال بقاعدة البيانات بنجاح"))
    .catch(err => console.error("❌ خطأ في الاتصال:", err));

// --- إعدادات Cloudinary لرفع الصور ---
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'wassitdz_uploads', resource_type: 'auto' }
});
const upload = multer({ storage: storage });

// --- تعريف النماذج (Models) ---
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number,
    title: String,
    priceUSD: String,
    priceDZ: String,
    coins: { type: String, default: "0" },
    gems: { type: String, default: "0" },
    imgs: [String],
    status: { type: String, default: 'متاح' },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String,
    mediationLink: String,
    sellAccountLink: String,
    announcement: { type: String, default: "مرحباً بكم في WassitDZ" },
    logoUrl: String,
    usdRate: { type: Number, default: 240 }
}));

const FAQ = mongoose.model('FAQ', new mongoose.Schema({
    question: String,
    answer: String
}));

// --- إعداد الجلسات (Sessions) ---
app.use(session({
    secret: 'wassit_secure_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// دالة لجلب IP الزائر (للحماية)
const getIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress;

// --- المسارات العامة (Public Routes) ---

app.get('/', async (req, res) => {
    try {
        const accounts = await Account.find().sort({ id: -1 });
        const settings = await Settings.findOne() || { usdRate: 240, announcement: "مرحباً بك" };
        const faqs = await FAQ.find();
        res.render('index', { accounts, settings, faqs });
    } catch (err) { res.status(500).send("خطأ في الخادم"); }
});

app.get('/account/:id', async (req, res) => {
    try {
        const account = await Account.findOneAndUpdate({ id: req.params.id }, { $inc: { views: 1 } }, { new: true });
        const settings = await Settings.findOne() || {};
        if (!account) return res.redirect('/');
        res.render('product', { account, settings });
    } catch (err) { res.redirect('/'); }
});

// --- مسارات الإدارة (Admin Routes) ---

app.get('/admin-panel', async (req, res) => {
    if (req.query.key !== process.env.ADMIN_KEY) {
        return res.status(403).render('blocked', { userIp: getIp(req) });
    }
    if (!req.session.isAdmin) return res.render('login', { adminKey: req.query.key });

    const accounts = await Account.find().sort({ id: -1 });
    const settings = await Settings.findOne() || {};
    const faqs = await FAQ.find();
    res.render('admin', { accounts, settings, faqs, adminKey: req.query.key });
});

app.post('/auth-admin', (req, res) => {
    const { username, password, adminKey } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
    } else {
        res.send("بيانات الدخول خاطئة!");
    }
});

app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    const lastAcc = await Account.findOne().sort({ id: -1 });
    const newId = lastAcc ? lastAcc.id + 1 : 1;
    await Account.create({ id: newId, ...req.body, imgs: req.files.map(f => f.path) });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

app.post('/update-settings', async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    await Settings.findOneAndUpdate({}, req.body, { upsert: true });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

app.get('/toggle-status/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    const acc = await Account.findOne({ id: req.params.id });
    if(acc) { acc.status = acc.status === 'متاح' ? 'تم البيع' : 'متاح'; await acc.save(); }
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

app.get('/delete-account/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    await Account.findOneAndDelete({ id: req.params.id });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

app.post('/add-faq', async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    await FAQ.create(req.body);
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// --- ميزة عدم النوم (Keep-Alive) ---
const SITE_URL = `https://test-1dba.onrender.com`;
setInterval(() => {
    axios.get(SITE_URL).then(() => console.log('Keep-Alive: الموقع مستيقظ ⚡')).catch(() => {});
}, 600000); // كل 10 دقائق

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
