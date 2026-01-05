/**
 * KR-CLI DOMINION - Main JavaScript
 * Landing page interactions and animations
 */

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initScrollAnimations();
    initCounters();
    initParticles();
    checkUserAuth();
});

/**
 * Initialize navbar behavior
 */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close on link click
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offset = navbar.offsetHeight + 20;
                    const targetPosition = target.offsetTop - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

/**
 * Initialize scroll-triggered animations
 */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Trigger counter animation if it's a stat
                if (entry.target.classList.contains('stat')) {
                    animateCounter(entry.target.querySelector('.stat-number'));
                }
            }
        });
    }, observerOptions);

    // Observe elements
    document.querySelectorAll('.feature-card, .tool-card, .pricing-card, .stat').forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .animate-on-scroll.visible {
            opacity: 1;
            transform: translateY(0);
        }
        .feature-card:nth-child(2) { transition-delay: 0.1s; }
        .feature-card:nth-child(3) { transition-delay: 0.2s; }
        .feature-card:nth-child(4) { transition-delay: 0.3s; }
        
        .tool-card { transition-delay: calc(var(--i, 0) * 0.05s); }
    `;
    document.head.appendChild(style);

    // Set stagger delays for tool cards
    document.querySelectorAll('.tool-card').forEach((card, i) => {
        card.style.setProperty('--i', i);
    });
}

/**
 * Animate counter numbers
 */
function initCounters() {
    // Counters will be triggered by scroll observer
}

function animateCounter(element) {
    if (!element || element.classList.contains('counted')) return;

    const target = parseInt(element.dataset.count) || 0;
    const duration = 2000; // 2 seconds
    const step = target / (duration / 16); // 60fps
    let current = 0;

    element.classList.add('counted');

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            clearInterval(timer);
            current = target;
        }

        // Format number
        if (target >= 1000) {
            element.textContent = Math.floor(current).toLocaleString();
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

/**
 * Create floating particles in hero
 */
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        createParticle(container);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.classList.add('particle');

    // Random properties
    const size = Math.random() * 4 + 2;
    const posX = Math.random() * 100;
    const delay = Math.random() * 10;
    const duration = Math.random() * 10 + 10;

    particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${posX}%;
        bottom: -10px;
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
    `;

    container.appendChild(particle);

    // Recreate particle after animation
    particle.addEventListener('animationend', () => {
        particle.remove();
        createParticle(container);
    });
}

/**
 * Check user authentication and update UI
 */
async function checkUserAuth() {
    // Wait for auth module to load
    if (!window.KRAuth) {
        setTimeout(checkUserAuth, 100);
        return;
    }

    const authResult = await window.KRAuth.checkAuth();

    if (authResult.authenticated) {
        // Update dashboard link
        const dashboardLink = document.getElementById('dashboard-link');
        if (dashboardLink) {
            dashboardLink.innerHTML = `
                <span style="margin-right: 5px;">👤</span>
                ${authResult.user.username || authResult.user.email.split('@')[0]}
            `;
        }

        // Hide auth-gate section if on landing page
        const authGate = document.getElementById('auth-gate');
        if (authGate) {
            authGate.style.display = 'none';
        }
    }
}

/**
 * Terminal typing effect
 */
function initTerminalEffect() {
    const terminalLines = document.querySelectorAll('.terminal-line:not(.output)');

    terminalLines.forEach((line, index) => {
        const text = line.querySelector('.terminal-text');
        if (text) {
            text.style.opacity = '0';
            setTimeout(() => {
                typeWriter(text, text.textContent);
            }, index * 1500);
        }
    });
}

function typeWriter(element, text, speed = 50) {
    element.textContent = '';
    element.style.opacity = '1';

    let i = 0;
    const timer = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(timer);
        }
    }, speed);
}

/**
 * Copy to clipboard helper
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado al portapapeles');
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

/**
 * Toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00FFFF' : '#ff5f56'};
        color: #000;
        padding: 15px 25px;
        border-radius: 5px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(toastStyle);

// Export utilities
window.KRUtils = {
    copyToClipboard,
    showToast,
    typeWriter
};
