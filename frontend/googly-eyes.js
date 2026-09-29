// Bikin semua elemen .eye (dengan .pupil di dalamnya) ngikutin arah kursor,
// kayak "googly eyes" — dipakai di halaman login & header chat.
(function () {
    function initGooglyEyes() {
        const eyeEls = document.querySelectorAll('.eye');
        if (!eyeEls.length) return;

        const eyes = Array.from(eyeEls).map((eye) => ({
            eye,
            pupil: eye.querySelector('.pupil'),
        })).filter((e) => e.pupil);

        function pointAt(clientX, clientY) {
            eyes.forEach(({ eye, pupil }) => {
                const rect = eye.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = clientX - cx;
                const dy = clientY - cy;
                const angle = Math.atan2(dy, dx);
                const maxDist = rect.width * 0.22;
                const dist = Math.min(maxDist, Math.hypot(dx, dy) / 10);
                pupil.style.transform =
                    `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
            });
        }

        window.addEventListener('mousemove', (e) => pointAt(e.clientX, e.clientY));
        window.addEventListener('touchmove', (e) => {
            const t = e.touches && e.touches[0];
            if (t) pointAt(t.clientX, t.clientY);
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGooglyEyes);
    } else {
        initGooglyEyes();
    }
})();
