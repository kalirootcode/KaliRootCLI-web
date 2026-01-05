/**
 * KR-CLI DOMINION - Dashboard JavaScript
 * User dashboard logic and data display
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Protect this page
    const isAuthed = await window.KRAuth.protectPage();

    if (isAuthed) {
        loadUserData();
    }
});

/**
 * Load and display user data
 */
async function loadUserData() {
    const user = window.KRAuth.getCurrentUser();

    if (!user) {
        console.error('No user data available');
        return;
    }

    // Update header
    document.getElementById('user-name').textContent = user.username || user.email.split('@')[0];
    document.getElementById('user-email').textContent = user.email;

    // Update badge
    const badge = document.getElementById('user-badge');
    const isPremium = window.KRAuth.isPremium();

    if (isPremium) {
        badge.textContent = 'PREMIUM';
        badge.classList.add('premium');
    } else {
        badge.textContent = 'FREE';
    }

    // Update stats
    document.getElementById('stat-credits').textContent = user.credit_balance || 0;
    document.getElementById('stat-days').textContent = calculateDaysLeft(user.subscription_expiry_date);
    document.getElementById('stat-spent').textContent = `$${user.total_spent || 0}`;

    // Hide upgrade button if premium
    if (isPremium) {
        const upgradeBtn = document.getElementById('upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.style.display = 'none';
        }
    }

    // Update account info
    document.getElementById('account-email').textContent = user.email;
    document.getElementById('account-username').textContent = user.username || '-';
    document.getElementById('account-plan').textContent = isPremium ? 'Premium' : 'Free';
    document.getElementById('account-created').textContent = formatDate(user.created_at);

    // Load query count (from chat history if available)
    loadQueryCount(user.id);
}

/**
 * Calculate days left in subscription
 */
function calculateDaysLeft(expiryDate) {
    if (!expiryDate) return 0;

    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry - now;

    if (diff <= 0) return 0;

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Load user's query count
 */
async function loadQueryCount(userId) {
    try {
        const client = await window.KRSupabase.init();

        const { count, error } = await client
            .from('cli_chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('role', 'user');

        if (!error && count !== null) {
            document.getElementById('stat-queries').textContent = count;
        }
    } catch (e) {
        console.error('Error loading query count:', e);
    }
}

/**
 * Animate stat numbers on load
 */
function animateStats() {
    document.querySelectorAll('.stat-value').forEach(el => {
        const value = el.textContent;

        // Skip non-numeric values
        if (value.startsWith('$')) {
            return;
        }

        const target = parseInt(value) || 0;
        animateNumber(el, target);
    });
}

function animateNumber(element, target) {
    let current = 0;
    const duration = 1000;
    const step = target / (duration / 16);

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            clearInterval(timer);
            current = target;
        }
        element.textContent = Math.floor(current);
    }, 16);
}
