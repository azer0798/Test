require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// 2. إعدادات Cloudinary لرفع الصور
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

// 3. النماذج المحدثة (Models)
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number, 
    title: String, 
    priceUSD: String, 
    priceDZ: String, 
    coins: String, // تمت إضافتها لتجنب خطأ صفحة التفاصيل
    gems: String,  // تمت إضافتها لتجنب خطأ صفحة التفاصيل
    linkType: String, 
    imgs: [String], 
    status: { type: String, default: 'متاح' },
    views: { type: Number, default: 0 }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String, mediationLink: String, sellAccountLink: String,
    buyNowLink: String, announcement: String, themeColor: String, logoUrl: String,
    usdRate: { type: Number, default: 240 }
}));

const FAQ = mongoose.model('FAQ', new mongoose.Schema({ question: String, answer: String }));

// 4. الإعدادات العامة
app.use(session({ secret: 'wassit_secure_key', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname);

const getIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress;

// --- 5. المسارات (Routes) ---

// الصفحة الرئيسية
app.get('/', async (req, res) => {
    const accounts = await Account.find().sort({ id: -1 });
    const settings = await Settings.findOne() || { usdRate: 240 };
    const faqs = await FAQ.find();
    res.render('index', { accounts, settings, faqs });
});

// المسار المفقود: صفحة تفاصيل الحساب (تم إصلاحه)
app.get('/account/:id', async (req, res) => {
    try {
        const account = await Account.findOneAndUpdate(
            { id: req.params.id }, 
            { $inc: { views: 1 } }, 
            { new: true }
        );
        const settings = await Settings.findOne() || {};

        if (!account) return res.redirect('/');
        res.render('product', { account, settings });
    } catch (err) {
        res.redirect('/');
    }
});

// الحماية والتمويه
app.get('/login', (req, res) => res.status(403).render('blocked', { userIp: getIp(req) }));

// لوحة التحكم
app.get('/admin-panel', async (req, res) => {
    if (req.query.key !== process.env.ADMIN_KEY) {
        return res.status(403).render('blocked', { userIp: getIp(req) });
    }
    if (!req.session.isAdmin) return res.render('login');

    const accounts = await Account.find().sort({ id: -1 });
    const settings = await Settings.findOne() || {};
    const faqs = await FAQ.find();
    res.render('admin', { accounts, settings, faqs });
});

// تسجيل الدخول للإدارة
app.post('/auth-admin', (req, res) => {
    if (req.body.username === process.env.ADMIN_USER && req.body.password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true; 
        res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
    } else {
        res.status(401).send("بيانات الدخول خاطئة");
    }
});

// إضافة حساب جديد
app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    const lastAcc = await Account.findOne().sort({ id: -1 });
    const newId = lastAcc ? lastAcc.id + 1 : 1;
    await Account.create({ 
        id: newId, 
        ...req.body, 
        imgs: req.files.map(f => f.path) 
    });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// تحديث الإعدادات
app.post('/update-settings', async (req, res) => {
    await Settings.findOneAndUpdate({}, req.body, { upsert: true });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// تغيير حالة الحساب (متاح/مباع)
app.get('/toggle-status/:id', async (req, res) => {
    const acc = await Account.findOne({ id: req.params.id });
    if(acc) { 
        acc.status = acc.status === 'متاح' ? 'تم البيع' : 'متاح'; 
        await acc.save(); 
    }
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// حذف حساب
app.get('/delete-account/:id', async (req, res) => {
    await Account.findOneAndDelete({ id: req.params.id });
    res.redirect(`/admin-panel?key=${process.env.ADMIN_KEY}`);
});

// تشغيل السيرفر
app.listen(process.env.PORT || 3000, () => console.log("🚀 Server is running..."));
