document.addEventListener('DOMContentLoaded', () => {
    // Scroll Navbar Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Reveal Animation on Scroll
    const reveals = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        reveals.forEach(reveal => {
            const revealTop = reveal.getBoundingClientRect().top;
            const revealPoint = 150;
            if (revealTop < windowHeight - revealPoint) {
                reveal.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger initial

    // Lightbox Modal for Screenshots
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');

    document.querySelectorAll('.glass-card img').forEach(img => {
        img.addEventListener('click', () => {
            lightbox.style.display = 'flex';
            lightboxImg.src = img.src;
        });
    });

    if (lightboxClose) {
        lightboxClose.addEventListener('click', () => {
            lightbox.style.display = 'none';
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target !== lightboxImg) {
                lightbox.style.display = 'none';
            }
        });
    }
});

// Helper Function for Copying LinkedIn Post Text
function copyPostText() {
    const postText = `💡 "En la gestión médica, la velocidad de desaprender modelos obsoletos es la mayor ventaja competitiva."\n\nPresentamos Controlab IA LIMS: La suite tecnológica que elimina las planillas manuales y automatiza el descuento de reactivos directamente desde los analizadores de red. Cero mermas no justificadas, 100% trazabilidad en SQL Server.\n\n#LIMS #LaboratorioClinico #SaludTech #ControlabIA #SoftwareMedico #Venezuela`;
    
    navigator.clipboard.writeText(postText).then(() => {
        alert("¡Texto promocional para LinkedIn copiado al portapapeles exitosamente!");
    }).catch(err => {
        console.error("Error al copiar texto:", err);
    });
}
