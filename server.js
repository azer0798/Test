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

// --- 1. إعداد MongoDB Atlas ---
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log("✅ Connected to MongoDB Atlas"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- 2. إعداد Cloudinary ---
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

// --- 3. نماذج البيانات (Models) ---
const Account = mongoose.model('Account', new mongoose.Schema({
    id: Number, title: String, priceUSD: String, priceDZ: String,
    players: String, linkType: String, imgs: [String]
}));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    supportLink: String, mediationLink: String, sellAccountLink: String,
    buyNowLink: String, announcement: String, themeColor: String
}));

// --- 4. إعدادات السيرفر ---
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'default_secret', 
    resave: false, 
    saveUninitialized: true 
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname);

// --- 5. ميزة الحفاظ على الموقع مستيقظاً (Anti-Sleep Ping) ---
const keepAlive = () => {
    // Render يملأ هذا المتغير تلقائياً باسم موقعك
    const siteUrl = process.env.RENDER_EXTERNAL_HOSTNAME 
        ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` 
        : null;

    if (siteUrl) {
        setInterval(async () => {
            try {
                await axios.get(siteUrl);
                console.log('⚡ Self-Ping successful: Site is awake.');
            } catch (err) {
                console.error('⚠️ Ping failed:', err.message);
            }
        }, 600000); // كل 10 دقائق
    }
};

// --- 6. المسارات (Routes) ---

app.get('/', async (req, res) => {
    try {
        const accounts = await Account.find();
        let settings = await Settings.findOne() || await Settings.create({
            supportLink: "#", mediationLink: "#", sellAccountLink: "#", 
            buyNowLink: "#", announcement: "مرحباً بكم في WassitDZ", themeColor: "#2563eb"
        });
        res.render('index', { accounts, settings });
    } catch (err) {
        res.status(500).send("Database Connection Error");
    }
});

app.get('/admin-panel', async (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    const accounts = await Account.find();
    const settings = await Settings.findOne();
    res.render('admin', { accounts, settings });
});

app.post('/add-account', upload.array('imageFiles', 5), async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Forbidden");
    try {
        const imagePaths = req.files.map(file => file.path);
        await Account.create({
            id: Math.floor(1000 + Math.random() * 9000),
            title: req.body.title, priceUSD: req.body.priceUSD, priceDZ: req.body.priceDZ,
            players: req.body.players, linkType: req.body.linkType, imgs: imagePaths
        });
        res.redirect('/admin-panel');
    } catch (err) { res.status(500).send("Upload Error"); }
});

app.post('/update-settings', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).send("Forbidden");
    await Settings.findOneAndUpdate({}, req.body);
    res.redirect('/admin-panel');
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
    } else {
        res.send("<script>alert('Wrong Credentials'); window.location='/login';</script>");
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    keepAlive(); // بدء ميزة منع النوم
});
