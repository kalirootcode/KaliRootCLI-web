/**
 * KR-CLI DOMINION - Cyber Menu Component
 * Shared JavaScript for hamburger menu
 */

// Toggle cyber menu
function toggleCyberMenu() {
    const btn = document.getElementById('cyber-menu-btn');
    const dropdown = document.getElementById('cyber-dropdown');
    if (btn && dropdown) {
        btn.classList.toggle('active');
        dropdown.classList.toggle('active');
    }
}

// Close cyber menu
function closeCyberMenu() {
    const btn = document.getElementById('cyber-menu-btn');
    const dropdown = document.getElementById('cyber-dropdown');
    if (btn && dropdown) {
        btn.classList.remove('active');
        dropdown.classList.remove('active');
    }
}

// Close menu when clicking outside
document.addEventListener('click', function (e) {
    const btn = document.getElementById('cyber-menu-btn');
    const dropdown = document.getElementById('cyber-dropdown');
    if (btn && dropdown && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        btn.classList.remove('active');
        dropdown.classList.remove('active');
    }
});

// Export for global access
window.toggleCyberMenu = toggleCyberMenu;
window.closeCyberMenu = closeCyberMenu;
