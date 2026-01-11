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
        loadLatestNews();
        loadEducationalProgress();
    }
});

/**
 * Load and display user data - fetch fresh from database
 */
async function loadUserData() {
    const cachedUser = window.KRAuth.getCurrentUser();
    console.log('[Dashboard] Cached user:', cachedUser);

    if (!cachedUser || !cachedUser.id) {
        console.error('[Dashboard] No user data available');
        return;
    }

    try {
        // Fetch fresh data from database
        const client = await window.KRSupabase.init();
        if (client) {
            const { data: freshData, error } = await client
                .from('cli_users')
                .select('*')
                .eq('id', cachedUser.id)
                .single();

            if (!error && freshData) {
                console.log('[Dashboard] Fresh user data:', freshData);
                // Merge fresh data with cached user
                Object.assign(cachedUser, freshData);
                // Update sessionStorage
                sessionStorage.setItem('kr_user', JSON.stringify(cachedUser));
            } else {
                console.warn('[Dashboard] Could not fetch fresh data:', error);
            }
        }

        // Update UI with user data
        updateUserUI(cachedUser);

    } catch (e) {
        console.error('[Dashboard] Error loading user data:', e);
        // Still update UI with cached data
        updateUserUI(cachedUser);
    }
}

/**
 * Update UI with user data
 */
function updateUserUI(user) {
    // Update header
    const userName = user.username || (user.email ? user.email.split('@')[0] : 'Usuario');
    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-email').textContent = user.email || '';

    // Determine if premium
    const isPremium = checkIsPremium(user);
    console.log('[Dashboard] Is Premium:', isPremium, 'Status:', user.subscription_status, 'Expiry:', user.subscription_expiry_date);

    // Update badge
    const badge = document.getElementById('user-badge');
    if (isPremium) {
        badge.textContent = 'PREMIUM';
        badge.classList.add('premium');
    } else {
        badge.textContent = 'FREE';
        badge.classList.remove('premium');
    }

    // Update stats
    const credits = user.credit_balance ?? 0;
    const daysLeft = calculateDaysLeft(user.subscription_expiry_date);

    document.getElementById('stat-credits').textContent = formatNumber(credits);
    document.getElementById('stat-queries').textContent = '...';
    document.getElementById('stat-days').textContent = daysLeft;
    document.getElementById('stat-courses').textContent = '...';

    console.log('[Dashboard] Stats - Credits:', credits, 'Days:', daysLeft);

    // Hide upgrade button if premium
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) {
        upgradeBtn.style.display = isPremium ? 'none' : 'flex';
    }

    // Update account info
    document.getElementById('account-email').textContent = user.email || '-';
    document.getElementById('account-username').textContent = user.username || '-';
    document.getElementById('account-plan').textContent = isPremium ? 'Premium' : 'Free';
    document.getElementById('account-created').textContent = formatDate(user.created_at);

    // Load query count and courses count async
    if (user.id) {
        loadQueryCount(user.id);
        loadCoursesCount();
    }
}

/**
 * Check if user is premium (more flexible check)
 */
function checkIsPremium(user) {
    if (!user) return false;

    // Check subscription_status
    const status = (user.subscription_status || '').toLowerCase();
    const isPremiumStatus = status === 'premium' || status === 'active';

    // Check expiry date
    const expiryDate = user.subscription_expiry_date;
    if (!expiryDate) return isPremiumStatus;

    const isNotExpired = new Date(expiryDate) > new Date();

    return isPremiumStatus && isNotExpired;
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
 * Format number with thousands separator
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('es-ES');
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
            document.getElementById('stat-queries').textContent = '0';
            return;
        }

        const { count, error } = await client
            .from('cli_chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('role', 'user');

        console.log('[Dashboard] Query count result:', count, error);

        if (!error && count !== null) {
            document.getElementById('stat-queries').textContent = formatNumber(count);
        } else {
            document.getElementById('stat-queries').textContent = '0';
        }
    } catch (e) {
        console.error('[Dashboard] Error loading query count:', e);
        document.getElementById('stat-queries').textContent = '0';
    }
}

/**
 * Load available courses count
 */
async function loadCoursesCount() {
    try {
        const apiUrl = (window.KR_API_CONFIG ? window.KR_API_CONFIG.EDUCATION_API : 'https://kalirootcli.onrender.com') + '/api/education/ai-courses';
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.success && data.courses) {
            document.getElementById('stat-courses').textContent = data.courses.length;
        } else {
            document.getElementById('stat-courses').textContent = '0';
        }
    } catch (e) {
        console.error('[Dashboard] Error loading courses count:', e);
        document.getElementById('stat-courses').textContent = '0';
    }
}

/**
 * Load latest news for dashboard
 */
async function loadLatestNews() {
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) return;

    try {
        const newsApiUrl = (window.KR_API_CONFIG ? window.KR_API_CONFIG.NEWS_API : 'https://kalirootcli.onrender.com') + '/api/news';
        const response = await fetch(newsApiUrl);
        const data = await response.json();

        if (data.success && data.news.length > 0) {
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
            newsGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">No hay noticias disponibles.</p>';
        }
    } catch (error) {
        console.error('[Dashboard] Error loading news:', error);
        newsGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6);">Error cargando noticias.</p>';
    }
}

/**
 * Load educational progress
 */
async function loadEducationalProgress() {
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

// Mobile nav toggle
document.getElementById('nav-toggle')?.addEventListener('click', () => {
    document.getElementById('nav-menu')?.classList.toggle('active');
});
