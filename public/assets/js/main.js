(function() {
    const scrollBtn = document.getElementById('scroll-top');
    const scrollThreshold = 300;

    function toggleScrollButton() {
        if (window.scrollY > scrollThreshold) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }

    window.addEventListener('scroll', toggleScrollButton, { passive: true });

    scrollBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    toggleScrollButton();
})();
