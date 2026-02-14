const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// إعداد المحرك وتنسيقات البيانات
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- بيانات الموقع (يفضل لاحقاً ربطها بملف JSON أو قاعدة بيانات) ---
let settings = {
    themeColor: '#007bff',
    logoUrl: 'https://res.cloudinary.com/dyaiiu0if/image/upload/v1770741343/1770741239456_kabqtl.png',
    announcement: 'مرحباً بكم في WassitDZ - المتجر الأول لبيع حسابات الألعاب في الجزائر',
    buyNowLink: 'https://wa.me/213xxxxxxxxx', // ضع رابط الواتساب أو التلغرام هنا
    mediationLink: '#',
    sellAccountLink: '#',
    supportLink: '#'
};

let accounts = []; // مصفوفة الحسابات
let faqs = [];     // مصفوفة الأسئلة الشائعة

// --- 1. ميزة التمويه الأمني (صفحة الحظر الوهمية) ---
app.get('/admin', (req, res) => {
    const SECRET_KEY = "Wassit2026"; // الكلمة السرية للدخول
    const userKey = req.query.key;
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (userKey === SECRET_KEY) {
        // إذا كان المفتاح صحيحاً، افتح لوحة التحكم
        res.render('admin', { accounts, settings, faqs });
    } else {
        // إذا حاول أي شخص الدخول بدون المفتاح، تظهر له صفحة الحظر (blocked.ejs)
        res.status(403).render('blocked', { userIp });
    }
});

// --- 2. المسارات الأساسية للمتجر ---

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.render('index', { accounts, settings, faqs });
});

// صفحة تفاصيل المنتج (الحساب)
app.get('/account/:id', (req, res) => {
    const account = accounts.find(a => a.id == req.params.id);
    if (account) {
        res.render('product', { account, settings });
    } else {
        res.redirect('/');
    }
});

// --- 3. ميزة Ping التلقائي (Keep-Alive) لمنع "نوم" السيرفر على Render ---
const startPinging = () => {
    const siteUrl = "https://test-1dba.onrender.com"; // رابط موقعك الذي زودتني به
    
    setInterval(async () => {
        try {
            await axios.get(siteUrl);
            console.log(`⚡ [${new Date().toLocaleTimeString()}] Ping Successful: Server is active.`);
        } catch (error) {
            console.error('❌ Ping Error:', error.message);
        }
    }, 600000); // إرسال طلب كل 10 دقائق
};

// --- 4. تشغيل السيرفر ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ===========================================
    🚀 السيرفر يعمل الآن على المنفذ: ${PORT}
    🔗 رابط الموقع: https://test-1dba.onrender.com
    🔐 لوحة التحكم: /admin?key=Wassit2026
    ===========================================
    `);
    
    // بدء عملية الـ Ping التلقائي
    startPinging();
});
