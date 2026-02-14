const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// إعداد السيرفر ليبحث عن الملفات في المجلد الرئيسي (Root)
app.set('view engine', 'ejs');
app.set('views', __dirname); // هنا أخبرناه أن الملفات موجودة بجانب server.js مباشرة

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // لجعل الصور والملفات الأخرى قابلة للوصول

// البيانات الافتراضية
let settings = {
    themeColor: '#007bff',
    logoUrl: 'https://res.cloudinary.com/dyaiiu0if/image/upload/v1770741343/1770741239456_kabqtl.png',
    announcement: 'مرحباً بكم في WassitDZ',
    buyNowLink: 'https://wa.me/213xxxxxxxxx',
    mediationLink: '#', sellAccountLink: '#', supportLink: '#'
};
let accounts = []; 
let faqs = [];

// --- نظام الحماية والتمويه ---
// أي شخص يدخل على رابط login القديم ستظهر له صفحة blocked.ejs
app.get('/login', (req, res) => {
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    res.status(403).render('blocked', { userIp });
});

app.get('/admin', (req, res) => {
    const SECRET_KEY = "Wassit2026";
    const userKey = req.query.key;
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (userKey === SECRET_KEY) {
        res.render('admin', { accounts, settings, faqs });
    } else {
        // سيظهر ملف blocked.ejs الموجود في المجلد الرئيسي
        res.status(403).render('blocked', { userIp });
    }
});

// المسار الرئيسي (سيفتح index.ejs من المجلد الرئيسي)
app.get('/', (req, res) => {
    res.render('index', { accounts, settings, faqs });
});

app.get('/account/:id', (req, res) => {
    const account = accounts.find(a => a.id == req.params.id);
    if (account) {
        res.render('product', { account, settings });
    } else {
        res.redirect('/');
    }
});

// --- ميزة البقاء نشطاً (Ping) لـ Render ---
const startPinging = () => {
    setInterval(async () => {
        try {
            await axios.get("https://test-1dba.onrender.com");
            console.log('⚡ Ping Active');
        } catch (e) { console.log('❌ Ping Fail'); }
    }, 600000); 
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل الآن`);
    startPinging();
});
