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

// إعدادات الرفع والبيانات
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// إعداد Cloudinary
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

// --- النماذج (Models) ---
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number, title: String, priceUSD: String, priceDZ: String, linkType: String, imgs: [String]
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String, mediationLink: String, sellAccountLink: String,
    buyNowLink: String, announcement: String, themeColor: String, logoUrl: String
}));

const FAQ = mongoose.model('FAQ', new mongoose.Schema({
    question: String, answer: String
}));

app.use(session({ secret: process.env.SESSION_SECRET || 'wassit_secure', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname);

// ميزة الحفاظ على النشاط (Anti-Sleep)
const keepAlive = () => {
    const url = process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : null;
    if (url) {
        setInterval(() => {
            axios.get(url).then(() => console.log('Ping OK')).catch(e => console.log('Ping Fail'));
        }, 600000); // كل 10 دقائق
    }
};

// --- المسارات (Routes) ---

app.get('/', async (req, res) => {
    try {
        const accounts = await Account.find();
        const faqs = await FAQ.find();
        let settings = await Settings.findOne() || await Settings.create({
            supportLink: "#", mediationLink: "#", sellAccountLink: "#", 
            buyNowLink: "#", announcement: "مرحباً بكم في WassitDZ", themeColor: "#2563eb", logoUrl: ""
        });
        res.render('index', { accounts, settings, faqs });
    } catch (err) { res.status(500).send("Database Error"); }
});

app.get('/admin-panel', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    const accounts = await Account.find();
    const settings = await Settings.findOne();
    const faqs = await FAQ.find();
    res.render('admin', { accounts, settings, faqs });
});

// إدارة الحسابات والأسئلة والإعدادات
app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    const imagePaths = req.files.map(file => file.path);
    await Account.create({ id: Math.floor(1000 + Math.random() * 9000), ...req.body, imgs: imagePaths });
    res.redirect('/admin-panel');
});

app.post('/update-settings', async (req, res) => {
    await Settings.findOneAndUpdate({}, req.body, { upsert: true });
    res.redirect('/admin-panel');
});

app.post('/add-faq', async (req, res) => {
    await FAQ.create(req.body);
    res.redirect('/admin-panel');
});

app.get('/delete-faq/:id', async (req, res) => {
    await FAQ.findByIdAndDelete(req.params.id);
    res.redirect('/admin-panel');
});

app.get('/delete/:id', async (req, res) => {
    await Account.findOneAndDelete({ id: req.params.id });
    res.redirect('/admin-panel');
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    if (req.body.username === process.env.ADMIN_USER && req.body.password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect('/admin-panel');
    } else { res.send("بيانات خاطئة"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Store Live on ${PORT}`); keepAlive(); });
