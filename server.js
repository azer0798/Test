const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- التأكد من تعريف المصفوفات لتجنب خطأ الـ Render ---
let settings = {
    themeColor: '#007bff',
    logoUrl: 'https://res.cloudinary.com/dyaiiu0if/image/upload/v1770741343/1770741239456_kabqtl.png',
    announcement: 'مرحباً بكم في WassitDZ',
    buyNowLink: 'https://wa.me/213xxxxxxxxx',
    mediationLink: '#',
    sellAccountLink: '#',
    supportLink: '#'
};
let accounts = []; 
let faqs = [];     

// --- نظام الحماية الذكي ---

// 1. تحويل مسار /login القديم إلى صفحة الحظر (للتمويه)
app.get('/login', (req, res) => {
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    res.status(403).render('blocked', { userIp });
});

// 2. مسار الإدارة الجديد مع المفتاح السري
app.get('/admin', (req, res) => {
    const SECRET_KEY = "Wassit2026"; 
    const userKey = req.query.key;
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (userKey === SECRET_KEY) {
        // تأكد من تمرير كل المتغيرات التي تحتاجها صفحة admin.ejs
        res.render('admin', { accounts, settings, faqs });
    } else {
        res.status(403).render('blocked', { userIp });
    }
});

// --- المسارات الأساسية ---

app.get('/', (req, res) => {
    // تمرير المصفوفات حتى لو كانت فارغة لمنع خطأ process_params
    res.render('index', { accounts: accounts || [], settings, faqs: faqs || [] });
});

app.get('/account/:id', (req, res) => {
    const account = accounts.find(a => a.id == req.params.id);
    if (account) {
        res.render('product', { account, settings });
    } else {
        res.redirect('/');
    }
});

// --- ميزة Ping التلقائي لـ Render ---
const startPinging = () => {
    const siteUrl = "https://test-1dba.onrender.com";
    setInterval(async () => {
        try {
            await axios.get(siteUrl);
            console.log('⚡ Ping successful');
        } catch (error) {
            console.error('❌ Ping failed');
        }
    }, 600000); 
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
    startPinging();
});
