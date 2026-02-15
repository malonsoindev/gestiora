'use strict';

(function() {
    const scrollBtn = document.getElementById('scroll-top');
    const SCROLL_THRESHOLD = 300;

    if (!scrollBtn) return;

    function handleScroll() {
        scrollBtn.classList.toggle('visible', window.scrollY > SCROLL_THRESHOLD);
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    scrollBtn.addEventListener('click', scrollToTop);

    handleScroll();
})();
