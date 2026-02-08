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

// إعداد الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

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

// النماذج
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number, title: String, priceUSD: String, priceDZ: String,
    players: String, linkType: String, imgs: [String]
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String, mediationLink: String, sellAccountLink: String,
    buyNowLink: String, announcement: String, themeColor: String
}));

app.use(session({ secret: process.env.SESSION_SECRET || 'secret', resave: false, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname);

// ميزة منع النوم
const keepAlive = () => {
    const url = process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : null;
    if (url) {
        setInterval(() => {
            axios.get(url).then(() => console.log('Pinged site')).catch(e => console.log('Ping error'));
        }, 600000); 
    }
};

// المسارات الأساسية
app.get('/', async (req, res) => {
    try {
        const accounts = await Account.find();
        const settings = await Settings.findOne() || { announcement: "مرحباً بكم", themeColor: "#2563eb" };
        res.render('index', { accounts, settings });
    } catch (e) { res.status(500).send("Database Error"); }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    if (req.body.username === process.env.ADMIN_USER && req.body.password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect('/admin-panel');
    } else { res.send("Error"); }
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
        linkType: req.body.linkType, imgs: imagePaths
    });
    res.redirect('/admin-panel');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server on ${PORT}`);
    keepAlive();
});
