/**
 * KR-CLI DOMINION - Dashboard JavaScript
 * User dashboard logic and data display
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Dashboard] Initializing...');

    // Protect this page
    const isAuthed = await window.KRAuth.protectPage();
    console.log('[Dashboard] Auth result:', isAuthed);

    if (isAuthed) {
        await loadUserData();
    }
});

/**
 * Load and display user data
 */
async function loadUserData() {
    const user = window.KRAuth.getCurrentUser();
    console.log('[Dashboard] User data:', user);

    if (!user) {
        console.error('[Dashboard] No user data available');
        return;
    }

    try {
        // Update header
        const userName = user.username || (user.email ? user.email.split('@')[0] : 'Usuario');
        document.getElementById('user-name').textContent = userName;
        document.getElementById('user-email').textContent = user.email || '';

        // Update badge
        const badge = document.getElementById('user-badge');
        const isPremium = window.KRAuth.isPremium();
        console.log('[Dashboard] Is Premium:', isPremium);

        if (isPremium) {
            badge.textContent = 'PREMIUM';
            badge.classList.add('premium');
        } else {
            badge.textContent = 'FREE';
        }

        // Update stats
        const credits = user.credit_balance ?? 0;
        const totalSpent = user.total_spent ?? 0;

        document.getElementById('stat-credits').textContent = credits;
        document.getElementById('stat-days').textContent = calculateDaysLeft(user.subscription_expiry_date);
        document.getElementById('stat-spent').textContent = `$${totalSpent}`;

        console.log('[Dashboard] Stats - Credits:', credits, 'Spent:', totalSpent);

        // Hide upgrade button if premium
        if (isPremium) {
            const upgradeBtn = document.getElementById('upgrade-btn');
            if (upgradeBtn) {
                upgradeBtn.style.display = 'none';
            }
        }

        // Update account info
        document.getElementById('account-email').textContent = user.email || '-';
        document.getElementById('account-username').textContent = user.username || '-';
        document.getElementById('account-plan').textContent = isPremium ? 'Premium' : 'Free';
        document.getElementById('account-created').textContent = formatDate(user.created_at);

        // Load query count
        if (user.id) {
            loadQueryCount(user.id);
        }

    } catch (e) {
        console.error('[Dashboard] Error loading user data:', e);
    }
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
        if (!client) {
            console.error('[Dashboard] Supabase client not initialized');
            return;
        }

        const { count, error } = await client
            .from('cli_chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('role', 'user');

        console.log('[Dashboard] Query count result:', count, error);

        if (!error && count !== null) {
            document.getElementById('stat-queries').textContent = count;
        }
    } catch (e) {
        console.error('[Dashboard] Error loading query count:', e);
    }
}
