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
        NEWS_API: 'https://YOUR-RENDER-SERVICE.onrender.com',
        EDUCATION_API: 'https://YOUR-RENDER-SERVICE.onrender.com'
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
