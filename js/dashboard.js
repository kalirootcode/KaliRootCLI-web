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

/**
 * Load latest news for dashboard
 */
async function loadLatestNews() {
    const newsGrid = document.getElementById('news-grid');

    try {
        // Use dynamic config - defaults to production URL
        const newsApiUrl = (window.KR_API_CONFIG ? window.KR_API_CONFIG.NEWS_API : 'https://kalirootcli.onrender.com') + '/api/news';
        const response = await fetch(newsApiUrl);
        const data = await response.json();

        if (data.success && data.news.length > 0) {
            // Show only first 3 news
            const latestNews = data.news.slice(0, 3);

            newsGrid.innerHTML = latestNews.map(news => `
                <div class="news-card" onclick="window.location.href='noticias.html'">
                    <span class="news-category ${news.category}">${news.category}</span>
                    <h3 class="news-title">${news.title}</h3>
                    <p class="news-summary">${news.summary_es.substring(0, 120)}...</p>
                    <div class="news-meta">
                        <span class="news-source">${news.source}</span>
                        <span class="news-date">${news.date}</span>
                    </div>
                </div>
            `).join('');
        } else {
            newsGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">No hay noticias disponibles. Inicia el servidor de noticias.</p>';
        }
    } catch (error) {
        console.error('[Dashboard] Error loading news:', error);
        newsGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">Error cargando noticias. Verifica que el servidor esté activo.</p>';
    }
}

/**
 * Load educational progress
 */
async function loadEducationalProgress() {
    // Get progress from localStorage
    const progress = JSON.parse(localStorage.getItem('kr_education_progress') || '{}');

    const coursesCompleted = Object.keys(progress.courses || {}).filter(c => progress.courses[c] === 100).length;
    const labsCompleted = Object.keys(progress.labs || {}).filter(l => progress.labs[l]).length;
    const totalProgress = calculateTotalProgress(progress);

    document.getElementById('courses-completed').textContent = `${coursesCompleted}/4`;
    document.getElementById('labs-completed').textContent = `${labsCompleted}/15`;
    document.getElementById('total-progress').textContent = `${totalProgress}%`;
    document.getElementById('education-progress-bar').style.width = `${totalProgress}%`;
}

function calculateTotalProgress(progress) {
    if (!progress.courses) return 0;
    const courses = Object.values(progress.courses);
    if (courses.length === 0) return 0;
    const sum = courses.reduce((a, b) => a + b, 0);
    return Math.round(sum / courses.length);
}

// Load news and progress when page loads
if (document.getElementById('news-grid')) {
    loadLatestNews();
    loadEducationalProgress();
}
