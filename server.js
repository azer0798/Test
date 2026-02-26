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
app.set('view engine', 'ejs');
app.set('views', __dirname);

// --- الاتصال بقاعدة البيانات ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- إعدادات Cloudinary ---
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

// --- النماذج (Models) ---
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number,
    title: String,
    priceUSD: String,
    priceDZ: String,
    coins: { type: String, default: "0" },
    gems: { type: String, default: "0" },
    imgs: [String],
    status: { type: String, default: 'متاح' },
    views: { type: Number, default: 0 }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String,       // رابط الدعم العام
    mediationLink: String,     // رابط قناة الوساطة (منفصل)
    buyNowLink: String,        // رابط الشراء المباشر (منفصل)
    sellAccountLink: String,
    announcement: { type: String, default: "مرحباً بكم في WassitDZ" },
    logoUrl: String,
    usdRate: { type: Number, default: 240 }
}));

const FAQ = mongoose.model('FAQ', new mongoose.Schema({
    question: String,
    answer: String
}));

// --- الجلسات والحماية ---
app.use(session({
    secret: 'wassit_secure_key_2026',
    resave: false,
    saveUninitialized: true
}));

const getIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress;

// --- المسارات العامة (Routes) ---

app.get('/', async (req, res) => {
    const accounts = await Account.find().sort({ id: -1 });
    const settings = await Settings.findOne() || { usdRate: 240 };
    const faqs = await FAQ.find();
    res.render('index', { accounts, settings, faqs });
});

app.get('/account/:id', async (req, res) => {
    try {
        const account = await Account.findOneAndUpdate({ id: req.params.id }, { $inc: { views: 1 } }, { new: true });
        const settings = await Settings.findOne() || {};
        if (!account) return res.redirect('/');
        res.render('product', { account, settings });
    } catch (err) { res.redirect('/'); }
});

// --- مسارات الإدارة (Admin & Edits) ---

app.get('/admin-panel', async (req, res) => {
    if (req.query.key !== process.env.ADMIN_KEY) return res.status(403).render('blocked', { userIp: getIp(req) });
    if (!req.session.isAdmin) return res.render('login');
    const accounts = await Account.find().sort({ id: -1 });
    const settings = await Settings.findOne() || {};
    const faqs = await FAQ.find();
    res.render('admin', { accounts, settings, faqs });
});

app.post('/auth-admin', (req, res) => {
    if (req.body.username === process.env.ADMIN_USER && req.body.password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
    } else { res.send("Error"); }
});

// إضافة حساب جديد
app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    const lastAcc = await Account.findOne().sort({ id: -1 });
    const newId = lastAcc ? lastAcc.id + 1 : 1;
    await Account.create({ id: newId, ...req.body, imgs: req.files.map(f => f.path) });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// ** جديد: تعديل بيانات الحساب **
app.post('/edit-account/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    await Account.findOneAndUpdate({ id: req.params.id }, req.body);
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// تحديث الإعدادات (الروابط المنفصلة)
app.post('/update-settings', async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    await Settings.findOneAndUpdate({}, req.body, { upsert: true });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// ** جديد: تعديل سؤال وجواب **
app.post('/edit-faq/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.sendStatus(403);
    await FAQ.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// حذف حساب أو سؤال
app.get('/delete-account/:id', async (req, res) => {
    await Account.findOneAndDelete({ id: req.params.id });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

app.get('/delete-faq/:id', async (req, res) => {
    await FAQ.findByIdAndDelete(req.params.id);
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

app.get('/toggle-status/:id', async (req, res) => {
    const acc = await Account.findOne({ id: req.params.id });
    if(acc) { acc.status = acc.status === 'متاح' ? 'تم البيع' : 'متاح'; await acc.save(); }
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// --- ميزة عدم النوم (Keep-Alive) ---
const SITE_URL = `https://test-1dba.onrender.com`;
setInterval(() => {
    axios.get(SITE_URL).then(() => console.log('Ping OK ✅')).catch(() => {});
}, 600000); 

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
