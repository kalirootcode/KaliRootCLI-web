/**
 * KR-CLI DOMINION - Auth Module
 * Web-based authentication system
 */

// User state
let currentUser = null;

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    // First check localStorage (remember me)
    const storedUserLocal = localStorage.getItem('kr_user');
    if (storedUserLocal) {
        try {
            currentUser = JSON.parse(storedUserLocal);
            return { authenticated: true, user: currentUser };
        } catch (e) {
            localStorage.removeItem('kr_user');
        }
    }

    // Check sessionStorage
    const storedUser = sessionStorage.getItem('kr_user');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            return { authenticated: true, user: currentUser };
        } catch (e) {
            sessionStorage.removeItem('kr_user');
        }
    }

    // Check Supabase session
    try {
        await window.KRSupabase.init();
        const session = await window.KRSupabase.getSession();
        if (session?.user) {
            const userData = await window.KRSupabase.getUserData(session.user.id);
            if (userData) {
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    ...userData
                };
                sessionStorage.setItem('kr_user', JSON.stringify(currentUser));
                return { authenticated: true, user: currentUser };
            }
        }
    } catch (e) {
        console.warn('Session check failed:', e);
    }

    return { authenticated: false, user: null };
}

/**
 * Get current user
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Logout user - clear all session data completely
 */
async function logout() {
    try {
        // Initialize Supabase first
        await window.KRSupabase.init();

        // Clear Supabase session
        if (typeof supabaseClient !== 'undefined') {
            await supabaseClient.auth.signOut();
        }
    } catch (e) {
        console.warn('Supabase signOut error:', e);
    }

    // Clear user state
    currentUser = null;

    // Clear all storage
    sessionStorage.clear();
    localStorage.removeItem('kr_user');
    localStorage.removeItem('kr_cart');

    // Clear any Supabase tokens from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Redirect to login page
    window.location.href = 'login.html';
}

/**
 * Check if user is premium
 */
function isPremium() {
    if (!currentUser) return false;

    const expiryDate = currentUser.subscription_expiry_date;
    if (!expiryDate) return false;

    return currentUser.subscription_status === 'premium' &&
        new Date(expiryDate) > new Date();
}

/**
 * Protect page - redirect to login if not authenticated
 */
async function protectPage() {
    const authResult = await checkAuth();

    if (!authResult.authenticated) {
        // Redirect to login page
        window.location.href = 'login.html';
        return false;
    }

    // Log page visit
    try {
        await window.KRSupabase.logActivity(
            authResult.user.id,
            'page_visit',
            window.location.pathname,
            { premium: isPremium() }
        );
    } catch (e) {
        console.warn('Activity log failed:', e);
    }

    return true;
}

/**
 * Update UI based on auth state
 */
function updateAuthUI() {
    const dashboardLink = document.getElementById('dashboard-link');
    const userNameEl = document.getElementById('user-name');

    if (currentUser) {
        const displayName = currentUser.username || currentUser.email?.split('@')[0] || 'Usuario';

        if (dashboardLink) {
            dashboardLink.textContent = displayName;
        }
        if (userNameEl) {
            userNameEl.textContent = displayName;
        }
    }
}

// Export
window.KRAuth = {
    checkAuth,
    getCurrentUser,
    logout,
    isPremium,
    protectPage,
    updateAuthUI
};
