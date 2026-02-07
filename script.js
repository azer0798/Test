document.addEventListener('DOMContentLoaded', () => {
    console.log("الصفحة جاهزة!");
    const heroText = document.querySelector('.fade-in');
    heroText.style.opacity = 0;
    heroText.style.transition = "opacity 2s";
    
    setTimeout(() => {
        heroText.style.opacity = 1;
    }, 500);
});
