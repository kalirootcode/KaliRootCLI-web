/**
 * KR-CLI DOMINION - Dashboard JavaScript
 * User dashboard logic and data display with session sync
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

        // Check session every 30 seconds
        setInterval(checkSession, 30000);
    }
});

/**
 * Check if session is still valid
 */
async function checkSession() {
    const user = window.KRAuth.getCurrentUser();
    if (!user || !user.id) {
        showSessionExpired();
        return;
    }

    try {
        const client = await window.KRSupabase.init();
        if (!client) {
            showSessionExpired();
            return;
        }

        // Try to verify user still exists and has valid session
        const { data, error } = await client
            .from('cli_users')
            .select('id, subscription_status')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            console.warn('[Dashboard] Session validation failed:', error);
            showSessionExpired();
        }
    } catch (e) {
        console.error('[Dashboard] Session check error:', e);
    }
}

/**
 * Show session expired message and redirect to login
 */
function showSessionExpired() {
    // Clear all session data
    sessionStorage.clear();
    localStorage.removeItem('kr_user');

    // Clear Supabase tokens
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Redirect to login
    window.location.href = 'login.html';
}

/**
 * Load and display user data - fetch fresh from database
 */
async function loadUserData() {
    const cachedUser = window.KRAuth.getCurrentUser();
    console.log('[Dashboard] Cached user:', cachedUser);

    if (!cachedUser || !cachedUser.id) {
        console.error('[Dashboard] No user data available');
        showSessionExpired();
        return;
    }

    let user = cachedUser;

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
                user = { ...cachedUser, ...freshData };
                sessionStorage.setItem('kr_user', JSON.stringify(user));
            } else {
                console.warn('[Dashboard] Could not fetch fresh data:', error);
            }
        }
    } catch (e) {
        console.error('[Dashboard] Error loading user data:', e);
    }

    // Update UI with user data
    updateUserUI(user);
}

/**
 * Update UI with user data
 */
function updateUserUI(user) {
    console.log('[Dashboard] Updating UI with user:', user);

    // Update header
    const userName = user.username || (user.email ? user.email.split('@')[0] : 'Usuario');
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');

    if (userNameEl) userNameEl.textContent = userName;
    if (userEmailEl) userEmailEl.textContent = user.email || '';

    // Determine if premium - more flexible check
    const isPremium = checkIsPremium(user);
    console.log('[Dashboard] Is Premium:', isPremium);
    console.log('[Dashboard] subscription_status:', user.subscription_status);
    console.log('[Dashboard] subscription_expiry_date:', user.subscription_expiry_date);

    // Update badge
    const badge = document.getElementById('user-badge');
    if (badge) {
        if (isPremium) {
            badge.textContent = 'PREMIUM';
            badge.classList.add('premium');
        } else {
            badge.textContent = 'FREE';
            badge.classList.remove('premium');
        }
    }

    // Update stats
    const credits = user.credit_balance ?? 0;
    const daysLeft = calculateDaysLeft(user.subscription_expiry_date);

    const creditsEl = document.getElementById('stat-credits');
    const queriesEl = document.getElementById('stat-queries');
    const daysEl = document.getElementById('stat-days');
    const coursesEl = document.getElementById('stat-courses');

    if (creditsEl) creditsEl.textContent = formatNumber(credits);
    if (queriesEl) queriesEl.textContent = '...';
    if (daysEl) daysEl.textContent = daysLeft;
    if (coursesEl) coursesEl.textContent = '...';

    console.log('[Dashboard] Stats - Credits:', credits, 'Days:', daysLeft);

    // Hide upgrade button if premium
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) {
        upgradeBtn.style.display = isPremium ? 'none' : 'flex';
    }

    // Update account info
    const accountEmailEl = document.getElementById('account-email');
    const accountUsernameEl = document.getElementById('account-username');
    const accountPlanEl = document.getElementById('account-plan');
    const accountCreatedEl = document.getElementById('account-created');

    if (accountEmailEl) accountEmailEl.textContent = user.email || '-';
    if (accountUsernameEl) accountUsernameEl.textContent = user.username || '-';
    if (accountPlanEl) accountPlanEl.textContent = isPremium ? 'Premium' : 'Free';
    if (accountCreatedEl) accountCreatedEl.textContent = formatDate(user.created_at);

    // Load async stats
    if (user.id) {
        loadQueryCount(user.id);
        loadCoursesCount();
    }
}

/**
 * Check if user is premium (flexible check)
 */
function checkIsPremium(user) {
    if (!user) return false;

    // Check subscription_status - accept multiple values
    const status = (user.subscription_status || '').toLowerCase();
    const isPremiumStatus = status === 'premium' || status === 'active' || status === 'pro';

    // If no expiry date set, just use status
    const expiryDate = user.subscription_expiry_date;
    if (!expiryDate) return isPremiumStatus;

    // Check if not expired
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
    const queriesEl = document.getElementById('stat-queries');
    if (!queriesEl) return;

    try {
        const client = await window.KRSupabase.init();
        if (!client) {
            queriesEl.textContent = '0';
            return;
        }

        const { count, error } = await client
            .from('cli_chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('role', 'user');

        console.log('[Dashboard] Query count result:', count, error);

        if (!error && count !== null) {
            queriesEl.textContent = formatNumber(count);
        } else {
            queriesEl.textContent = '0';
        }
    } catch (e) {
        console.error('[Dashboard] Error loading query count:', e);
        queriesEl.textContent = '0';
    }
}

/**
 * Load available courses count
 */
async function loadCoursesCount() {
    const coursesEl = document.getElementById('stat-courses');
    if (!coursesEl) return;

    try {
        const apiUrl = (window.KR_API_CONFIG ? window.KR_API_CONFIG.EDUCATION_API : 'https://kalirootcli.onrender.com') + '/api/education/ai-courses';
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.success && data.courses) {
            coursesEl.textContent = data.courses.length;
        } else {
            coursesEl.textContent = '0';
        }
    } catch (e) {
        console.error('[Dashboard] Error loading courses count:', e);
        coursesEl.textContent = '0';
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

    const coursesCompletedEl = document.getElementById('courses-completed');
    const labsCompletedEl = document.getElementById('labs-completed');
    const totalProgressEl = document.getElementById('total-progress');
    const progressBarEl = document.getElementById('education-progress-bar');

    if (coursesCompletedEl) coursesCompletedEl.textContent = `${coursesCompleted}/4`;
    if (labsCompletedEl) labsCompletedEl.textContent = `${labsCompleted}/15`;
    if (totalProgressEl) totalProgressEl.textContent = `${totalProgress}%`;
    if (progressBarEl) progressBarEl.style.width = `${totalProgress}%`;
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
