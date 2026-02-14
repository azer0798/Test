const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session'); // نظام الجلسات الأصلي الخاص بك
const fs = require('fs');
const app = express();

// --- إعدادات المحرك (البحث في المجلد الرئيسي كما طلبت) ---
app.set('view engine', 'ejs');
app.set('views', __dirname); 

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// --- دوال استرجاع البيانات (السحابات) ---
// تأكد أن هذه الملفات موجودة في المجلد الرئيسي
const getData = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const saveData = (file, data) => fs.writeFileSync(path.join(__dirname, file), JSON.stringify(data, null, 2));

// --- 1. نظام الحماية والتمويه (التعديل الجديد) ---
app.get('/admin', (req, res) => {
    const SECRET_KEY = "Wassit2026"; 
    const userKey = req.query.key;
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // إذا لم يستخدم المفتاح السري، أظهر له صفحة الحظر فوراً
    if (userKey !== SECRET_KEY) {
        return res.status(403).render('blocked', { userIp });
    }
    
    // إذا استخدم المفتاح، تحقق هل هو مسجل دخول أصلاً؟
    if (req.session.loggedIn) {
        const accounts = getData('accounts.json');
        const settings = getData('settings.json');
        const faqs = getData('faqs.json');
        res.render('admin', { accounts, settings, faqs });
    } else {
        res.redirect('/login'); // إذا معه المفتاح بس مش مسجل دخول يروح لصفحة اللوجن
    }
});

// --- 2. نظام تسجيل الدخول (الأصلي الخاص بك) ---
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const settings = getData('settings.json');
    
    if (email === settings.adminEmail && password === settings.adminPassword) {
        req.session.loggedIn = true;
        // عند النجاح يوجهه للأدمن مع المفتاح السري ليعمل الرابط
        res.redirect('/admin?key=Wassit2026');
    } else {
        res.send('بريد أو كلمة سر خاطئة');
    }
});

// --- 3. المسارات العامة (استرجاع البيانات من السحابات) ---
app.get('/', (req, res) => {
    const accounts = getData('accounts.json');
    const settings = getData('settings.json');
    const faqs = getData('faqs.json');
    res.render('index', { accounts, settings, faqs });
});

app.get('/account/:id', (req, res) => {
    const accounts = getData('accounts.json');
    const settings = getData('settings.json');
    const account = accounts.find(a => a.id == req.params.id);
    if (account) {
        res.render('product', { account, settings });
    } else {
        res.redirect('/');
    }
});

// --- 4. ميزة الـ Ping التلقائي (Keep-Alive) ---
const startPinging = () => {
    const siteUrl = "https://test-1dba.onrender.com";
    setInterval(async () => {
        try {
            await axios.get(siteUrl);
            console.log('⚡ Ping Active: Site is awake');
        } catch (e) { console.log('❌ Ping Fail'); }
    }, 600000); 
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل واسترجاع البيانات من JSON مفعل`);
    startPinging();
});
