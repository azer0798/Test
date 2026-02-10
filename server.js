require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const axios = require('axios');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

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

// تنظيف الروابط من الحروف المخفية تلقائياً
const cleanText = (text) => typeof text === 'string' ? text.replace(/[^\x20-\x7E]/g, '').trim() : text;

app.get('/', async (req, res) => {
    const accounts = await Account.find();
    const faqs = await FAQ.find();
    let settings = await Settings.findOne() || await Settings.create({
        supportLink: "#", mediationLink: "#", sellAccountLink: "#", 
        buyNowLink: "#", announcement: "مرحباً بكم", themeColor: "#2563eb", logoUrl: ""
    });
    res.render('index', { accounts, settings, faqs });
});

app.get('/admin-panel', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    const accounts = await Account.find();
    const settings = await Settings.findOne();
    const faqs = await FAQ.find();
    res.render('admin', { accounts, settings, faqs });
});

app.post('/update-settings', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Forbidden");
    let data = { ...req.body };
    for (let key in data) data[key] = cleanText(data[key]); // تنظيف الروابط هنا
    await Settings.findOneAndUpdate({}, data, { upsert: true });
    res.redirect('/admin-panel');
});

app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Forbidden");
    const imagePaths = req.files.map(file => file.path);
    await Account.create({ id: Math.floor(1000 + Math.random() * 9000), ...req.body, imgs: imagePaths });
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
    } else { res.send("Error"); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Server on ${PORT}`); });
