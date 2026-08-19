(() => {
    'use strict';

    const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
    ).matches;
    const supportsObserver = 'IntersectionObserver' in window;

    let revealObserver;
    let mutationObserver;
    let scrollFrame;
    let navLinks = [];
    let navSections = [];
    let polyhedronStage;
    let polyhedronFaces = [];
    let dataField;
    let dataSignal;
    let dataSignalGhost;
    let dataNetworkLeft;
    let dataNetworkRight;

    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');

    const ambient = document.createElement('div');
    ambient.className = 'scroll-ambient';
    ambient.setAttribute('aria-hidden', 'true');

    function createDataField() {
        dataField = document.createElement('div');
        dataField.className = 'scroll-data-field';
        dataField.setAttribute('aria-hidden', 'true');
        dataField.innerHTML = `
            <svg viewBox="0 0 1000 600" preserveAspectRatio="none" focusable="false">
                <g class="data-network data-network--left">
                    <path d="M26 124 L104 74 L174 118 L118 188 L42 218 M104 74 L118 188 M174 118 L220 58" />
                    <circle cx="26" cy="124" r="3" />
                    <circle cx="104" cy="74" r="4" />
                    <circle cx="174" cy="118" r="3" />
                    <circle cx="118" cy="188" r="3.5" />
                    <circle cx="42" cy="218" r="2.5" />
                    <circle cx="220" cy="58" r="2.5" />
                </g>
                <g class="data-network data-network--right">
                    <path d="M768 456 L836 396 L918 430 L972 356 M836 396 L854 516 L946 542 L918 430 M768 456 L724 530" />
                    <circle cx="768" cy="456" r="3" />
                    <circle cx="836" cy="396" r="3.5" />
                    <circle cx="918" cy="430" r="4" />
                    <circle cx="972" cy="356" r="2.5" />
                    <circle cx="854" cy="516" r="3" />
                    <circle cx="946" cy="542" r="3" />
                    <circle cx="724" cy="530" r="2.5" />
                </g>
                <path
                    class="data-signal data-signal--ghost"
                    pathLength="1"
                    d="M-40 204 L84 204 L104 190 L122 218 L142 204 L240 204 L260 196 L282 212 L304 204 L420 204 L442 176 L460 238 L482 146 L504 222 L526 204 L640 204 L664 194 L688 214 L712 204 L840 204 L864 184 L886 226 L906 204 L1040 204"
                />
                <path
                    class="data-signal data-signal--primary"
                    pathLength="1"
                    d="M-40 410 L70 410 L94 410 L108 382 L120 442 L136 326 L154 430 L172 410 L258 410 L276 396 L294 424 L312 410 L410 410 L432 410 L446 374 L460 456 L478 304 L498 438 L516 410 L618 410 L638 398 L658 422 L678 410 L786 410 L806 410 L820 380 L834 448 L852 320 L872 434 L890 410 L1040 410"
                />
            </svg>
        `;

        dataSignal = dataField.querySelector('.data-signal--primary');
        dataSignalGhost = dataField.querySelector('.data-signal--ghost');
        dataNetworkLeft = dataField.querySelector('.data-network--left');
        dataNetworkRight = dataField.querySelector('.data-network--right');
    }

    function reveal(element) {
        element.classList.add('is-visible');
        revealObserver?.unobserve(element);
    }

    function prepare(element, options = {}) {
        if (!element || element.dataset.scrollEnhanced === 'true') return;

        element.dataset.scrollEnhanced = 'true';
        element.classList.add('scroll-reveal');

        if (options.className) element.classList.add(options.className);
        if (options.direction) element.dataset.reveal = options.direction;
        if (options.delay) {
            element.style.setProperty('--reveal-delay', `${options.delay}ms`);
        }

        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 0.94) {
            reveal(element);
        } else {
            revealObserver.observe(element);
        }
    }

    function prepareGroup(selector, options = {}) {
        document.querySelectorAll(selector).forEach((element, index) => {
            prepare(element, {
                ...options,
                delay: Math.min(
                    (options.startDelay || 0) +
                        index * (options.stagger || 0),
                    options.maxDelay || 240,
                ),
            });
        });
    }

    function refreshNavigation() {
        navLinks = Array.from(
            document.querySelectorAll('.nav-link[href^="#"]'),
        );

        const sectionIds = [
            ...new Set(
                navLinks
                    .map((link) => link.getAttribute('href').slice(1))
                    .filter(Boolean),
            ),
        ];

        navSections = sectionIds
            .map((id) => document.getElementById(id))
            .filter(Boolean);
    }

    function preparePolyhedron() {
        polyhedronStage = document.querySelector('main');
        if (!polyhedronStage) return;

        polyhedronStage.classList.add('polyhedron-stage');
        polyhedronFaces = Array.from(
            polyhedronStage.querySelectorAll(':scope > section:not(#about)'),
        );
        polyhedronFaces.forEach((face) => {
            face.classList.add('polyhedron-face');
        });
    }

    function preparePage() {
        preparePolyhedron();

        prepare(document.querySelector('#about > div > div:first-child'), {
            className: 'scroll-portrait',
            direction: 'left',
        });

        prepareGroup('#about > div > div:last-child > *', {
            stagger: 70,
        });
        prepareGroup('main section > h2', {
            className: 'scroll-section-title',
        });
        prepareGroup('#interests > div > article', {
            className: 'polished-card',
            stagger: 65,
        });

        [
            '#projects .max-w-4xl > div',
            '#publications .max-w-4xl > div',
            '#blog .max-w-4xl > div',
        ].forEach((selector) => {
            prepareGroup(selector, {
                className: 'polished-card',
                stagger: 75,
            });
        });

        prepareGroup('#contact .container > *', {
            stagger: 60,
        });

        refreshNavigation();

        if (
            document.querySelector('#header-placeholder header') &&
            document.querySelector('#footer-placeholder footer')
        ) {
            mutationObserver?.disconnect();
        }
    }

    function clamp(value, minimum = 0, maximum = 1) {
        return Math.min(Math.max(value, minimum), maximum);
    }

    function smoothStep(value) {
        return value * value * (3 - 2 * value);
    }

    function updatePolyhedron() {
        if (!polyhedronStage || !polyhedronFaces.length) return;

        const viewportHeight = window.innerHeight;
        const stageTop =
            polyhedronStage.getBoundingClientRect().top + window.scrollY;
        const eyePosition = window.scrollY + viewportHeight * 0.52 - stageTop;
        const hingeRange = Math.min(viewportHeight * 0.68, 560);
        const maxRotation = window.innerWidth < 768 ? 54 : 68;

        polyhedronStage.style.setProperty(
            '--polyhedron-eye',
            `${eyePosition}px`,
        );

        const faceStates = polyhedronFaces.map((face) => {
            const faceTop = stageTop + face.offsetTop - window.scrollY;
            const faceBottom = faceTop + face.offsetHeight;
            const entryProgress = smoothStep(
                clamp((viewportHeight - faceTop) / hingeRange),
            );
            const exitProgress = smoothStep(
                clamp((hingeRange - faceBottom) / hingeRange),
            );
            let rotation =
                -(1 - entryProgress) * maxRotation +
                exitProgress * maxRotation;

            if (Math.abs(rotation) < 0.12) rotation = 0;

            const rotationAmount = Math.abs(rotation) / maxRotation;
            const depth =
                -rotationAmount * (window.innerWidth < 768 ? 76 : 118);
            const origin =
                entryProgress < 0.999
                    ? 'top'
                    : exitProgress > 0.001
                      ? 'bottom'
                      : 'center';

            return { depth, face, origin, rotation, rotationAmount };
        });

        faceStates.forEach(
            ({ depth, face, origin, rotation, rotationAmount }) => {
                face.style.setProperty(
                    '--face-rotation',
                    `${rotation.toFixed(2)}deg`,
                );
                face.style.setProperty(
                    '--face-depth',
                    `${depth.toFixed(1)}px`,
                );
                face.style.setProperty('--face-origin', origin);
                face.style.setProperty(
                    '--face-sheen',
                    rotationAmount.toFixed(3),
                );
                face.classList.toggle('is-transforming', rotation !== 0);
            },
        );
    }

    function updateDataField(scrollRatio) {
        if (!dataField || !polyhedronStage || !polyhedronFaces.length) return;

        const stageTop =
            polyhedronStage.getBoundingClientRect().top + window.scrollY;
        const firstFaceTop = stageTop + polyhedronFaces[0].offsetTop;
        const fadeDistance = window.innerHeight * 0.58;
        const entrance = smoothStep(
            clamp(
                (window.scrollY + window.innerHeight * 0.82 - firstFaceTop) /
                    fadeDistance,
            ),
        );
        const maximumOpacity = window.innerWidth < 768 ? 0.17 : 0.26;
        const drawProgress = clamp(0.1 + scrollRatio * 1.02);
        const drift = scrollRatio * (window.innerWidth < 768 ? 18 : 34);

        dataField.style.opacity = (entrance * maximumOpacity).toFixed(3);
        dataSignal.style.strokeDashoffset = (1 - drawProgress).toFixed(3);
        dataSignalGhost.style.strokeDashoffset = (-scrollRatio * 0.36).toFixed(
            3,
        );
        dataNetworkLeft.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) rotate(${(scrollRatio * 1.4).toFixed(2)}deg)`;
        dataNetworkRight.style.transform = `translate3d(0, ${(-drift * 0.72).toFixed(1)}px, 0) rotate(${(-scrollRatio * 1.1).toFixed(2)}deg)`;
    }

    function updateScrollEffects() {
        scrollFrame = undefined;

        const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1,
        );
        const scrollRatio = Math.min(window.scrollY / maxScroll, 1);

        progress.style.transform = `scaleX(${scrollRatio})`;
        ambient.style.setProperty(
            '--ambient-shift',
            `${-20 + scrollRatio * 70}px`,
        );

        updateDataField(scrollRatio);
        updatePolyhedron();

        const marker = window.innerHeight * 0.36;
        let activeSection;

        navSections.forEach((section) => {
            const bounds = section.getBoundingClientRect();
            if (bounds.top <= marker && bounds.bottom > marker) {
                activeSection = section.id;
            }
        });

        navLinks.forEach((link) => {
            const isActive = link.getAttribute('href') === `#${activeSection}`;
            link.classList.toggle('is-active', isActive);

            if (isActive) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    }

    function requestScrollUpdate() {
        if (scrollFrame) return;
        scrollFrame = window.requestAnimationFrame(updateScrollEffects);
    }

    function initialize() {
        if (reducedMotion || !supportsObserver) {
            document.documentElement.classList.add('motion-reduced');
            return;
        }

        createDataField();
        document.body.prepend(dataField);
        document.body.prepend(ambient);
        document.body.prepend(progress);

        revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) reveal(entry.target);
                });
            },
            {
                rootMargin: '0px 0px -4% 0px',
                threshold: 0.08,
            },
        );

        preparePage();
        document.documentElement.classList.add('motion-enhanced');

        mutationObserver = new MutationObserver(preparePage);
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        window.addEventListener('scroll', requestScrollUpdate, {
            passive: true,
        });
        window.addEventListener('resize', requestScrollUpdate, {
            passive: true,
        });

        requestScrollUpdate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, {
            once: true,
        });
    } else {
        initialize();
    }
})();
