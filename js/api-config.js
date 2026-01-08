/**
 * KR-CLI Educational Platform - API Configuration
 * This file is safe to commit (no secrets)
 */

// API Configuration
const API_CONFIG = {
    // Development (local)
    development: {
        NEWS_API: 'http://localhost:5001',
        EDUCATION_API: 'http://localhost:5002'
    },

    // Production (Render)
    production: {
        NEWS_API: 'https://kalirootcli.onrender.com',
        EDUCATION_API: 'https://kalirootcli.onrender.com'
    }
};

// Auto-detect environment
const ENV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'development'
    : 'production';

// Export current config
window.KR_API_CONFIG = API_CONFIG[ENV];

console.log(`[API Config] Running in ${ENV} mode`);
console.log(`[API Config] News API: ${window.KR_API_CONFIG.NEWS_API}`);
console.log(`[API Config] Education API: ${window.KR_API_CONFIG.EDUCATION_API}`);

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function () {
    const navToggle = document.getElementById('nav-toggle') || document.querySelector('.nav-toggle');
    const navMenu = document.getElementById('nav-menu') || document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    console.log('[Mobile] Navigation toggle initialized');
});
