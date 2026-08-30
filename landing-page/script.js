// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Scroll Reveal Animation via IntersectionObserver
const revealElements = document.querySelectorAll('.reveal');

const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // Optional: stop observing once revealed
        }
    });
};

const revealOptions = {
    threshold: 0.15, // Trigger when 15% of element is visible
    rootMargin: "0px 0px -50px 0px"
};

const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// Activate first section immediately
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const hero = document.getElementById('hero');
        if(hero) hero.classList.add('active');
    }, 100);
});

// Lightbox Logic
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.lightbox-close');
const images = document.querySelectorAll('img');

images.forEach(img => {
    // Evitar que el logo o iconos abran el lightbox si hubiera, pero aquí todas las img son capturas
    img.classList.add('clickable-img');
    img.title = "Haz clic para ampliar pantalla completa";
    img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Detener el scroll de fondo
    });
});

const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restaurar scroll
};

if(closeBtn) closeBtn.addEventListener('click', closeLightbox);
if(lightbox) lightbox.addEventListener('click', (e) => {
    if (e.target !== lightboxImg) closeLightbox();
});
