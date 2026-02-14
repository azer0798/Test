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

// إعدادات البيئة
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const ADMIN_KEY = process.env.ADMIN_KEY || "Wassit2026";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'wassit_secret_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // يوم واحد
}));

app.set('view engine', 'ejs');
app.set('views', __dirname);

// الاتصال بـ MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ تم الاتصال بقاعدة البيانات بنجاح"))
    .catch(err => console.error("❌ خطأ في اتصال قاعدة البيانات:", err));

// إعدادات Cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET 
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'wassitdz_store', resource_type: 'auto' }
});
const upload = multer({ storage: storage });

// --- النماذج (Models) ---
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number,
    title: String,
    priceUSD: String,
    priceDZ: String,
    coins: String,
    gems: String,
    imgs: [String],
    status: { type: String, default: 'متاح' },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String,
    mediationLink: String,
    sellAccountLink: String,
    announcement: String,
    logoUrl: String,
    usdRate: { type: Number, default: 240 }
}));

const FAQ = mongoose.model('FAQ', new mongoose.Schema({
    question: String,
    answer: String
}));

// --- المسارات العامة (Public Routes) ---

// الصفحة الرئيسية
app.get('/', async (req, res) => {
    try {
        const accounts = await Account.find().sort({ id: -1 });
        const settings = await Settings.findOne() || { usdRate: 240, announcement: "مرحباً بكم في WassitDZ" };
        const faqs = await FAQ.find();
        res.render('index', { accounts, settings, faqs });
    } catch (err) {
        res.status(500).send("خطأ في السيرفر");
    }
});

// صفحة تفاصيل الحساب
app.get('/account/:id', async (req, res) => {
    try {
        const account = await Account.findOneAndUpdate({ id: req.params.id }, { $inc: { views: 1 } }, { new: true });
        const settings = await Settings.findOne() || {};
        if (!account) return res.redirect('/');
        res.render('product', { account, settings });
    } catch (err) {
        res.redirect('/');
    }
});

// --- مسارات الإدارة (Admin Routes) ---

// دخول لوحة التحكم (بالرابط المحمي)
app.get('/admin-panel', async (req, res) => {
    const queryKey = req.query.key;

    // التحقق من مفتاح الأمان في الرابط
    if (queryKey !== ADMIN_KEY) {
        return res.status(403).send("<h1>403 Forbidden</h1><p>مفتاح الأمان غير صحيح.</p>");
    }

    // إذا لم يسجل الدخول بعد، نفتح صفحة اللوجن
    if (!req.session.isAdmin) {
        return res.render('login', { adminKey: queryKey });
    }

    // عرض اللوحة
    const accounts = await Account.find().sort({ id: -1 });
    const settings = await Settings.findOne() || { usdRate: 240 };
    const faqs = await FAQ.find();
    res.render('admin', { accounts, settings, faqs, adminKey: queryKey });
});

// التحقق من اسم المستخدم وكلمة المرور
app.post('/auth-admin', (req, res) => {
    const { username, password, adminKey } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect(`/admin-panel?key=${ADMIN_KEY}`);
    } else {
        res.send("بيانات الدخول خاطئة! <a href='javascript:history.back()'>عد للخلف</a>");
    }
});

// إضافة حساب جديد
app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    const lastAcc = await Account.findOne().sort({ id: -1 });
    const newId = lastAcc ? lastAcc.id + 1 : 1;
    
    await Account.create({
        id: newId,
        title: req.body.title,
        priceDZ: req.body.priceDZ,
        priceUSD: req.body.priceUSD,
        coins: req.body.coins,
        gems: req.body.gems,
        imgs: req.files.map(f => f.path)
    });
    res.redirect(`/admin-panel?key=${ADMIN_KEY}`);
});

// تحديث الإعدادات
app.post('/update-settings', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    await Settings.findOneAndUpdate({}, req.body, { upsert: true });
    res.redirect(`/admin-panel?key=${ADMIN_KEY}`);
});

// تغيير حالة الحساب (متاح/مباع)
app.get('/toggle-status/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    const acc = await Account.findOne({ id: req.params.id });
    if (acc) {
        acc.status = acc.status === 'متاح' ? 'تم البيع' : 'متاح';
        await acc.save();
    }
    res.redirect(`/admin-panel?key=${ADMIN_KEY}`);
});

// حذف حساب
app.get('/delete-account/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    await Account.findOneAndDelete({ id: req.params.id });
    res.redirect(`/admin-panel?key=${ADMIN_KEY}`);
});

// الأسئلة الشائعة
app.post('/add-faq', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    await FAQ.create(req.body);
    res.redirect(`/admin-panel?key=${ADMIN_KEY}`);
});

app.get('/delete-faq/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/');
    await FAQ.findByIdAndDelete(req.params.id);
    res.redirect(`/admin-panel?key=${ADMIN_KEY}`);
});

// نظام البينج (Ping) لإبقاء السيرفر نشطاً على Render
setInterval(() => {
    axios.get(`https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:3000'}`).catch(() => {});
}, 600000); // كل 10 دقائق

app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
