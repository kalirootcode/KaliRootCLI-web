/**
 * KR-CLI DOMINION - Auth Module
 * Handle CLI-to-Web authentication flow
 */

// User state
let currentUser = null;

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    // Check URL for CLI token
    const urlParams = new URLSearchParams(window.location.search);
    const cliToken = urlParams.get('token');

    if (cliToken) {
        // Validate CLI token
        const result = await window.KRSupabase.validateCLIToken(cliToken);

        if (result.valid) {
            currentUser = result.user;
            // Store in sessionStorage for this tab
            sessionStorage.setItem('kr_user', JSON.stringify(currentUser));
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return { authenticated: true, user: currentUser };
        } else {
            console.error('CLI Token validation failed:', result.error);
        }
    }

    // Check sessionStorage for existing session
    const storedUser = sessionStorage.getItem('kr_user');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            return { authenticated: true, user: currentUser };
        } catch (e) {
            sessionStorage.removeItem('kr_user');
        }
    }

    // Check Supabase session (for users who logged in via web previously)
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

    return { authenticated: false, user: null };
}

/**
 * Get current user
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Logout user
 */
function logout() {
    currentUser = null;
    sessionStorage.removeItem('kr_user');
    window.location.href = 'index.html';
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
 * Protect page - redirect if not authenticated
 */
async function protectPage() {
    const authResult = await checkAuth();

    if (!authResult.authenticated) {
        // Show auth gate or redirect
        showAuthGate();
        return false;
    }

    // Log page visit
    await window.KRSupabase.logActivity(
        authResult.user.id,
        'page_visit',
        window.location.pathname,
        { premium: isPremium() }
    );

    return true;
}

/**
 * Show authentication gate modal
 */
function showAuthGate() {
    // Check if gate already exists
    if (document.getElementById('auth-gate-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'auth-gate-modal';
    modal.innerHTML = `
        <div class="auth-gate-overlay">
            <div class="auth-gate-content">
                <div class="auth-gate-icon">🔐</div>
                <h2>Acceso Restringido</h2>
                <p>Para acceder a esta sección, debes estar <strong>logueado desde la terminal</strong> de KR-CLI.</p>
                
                <div class="auth-gate-steps">
                    <div class="auth-step">
                        <span class="step-num">1</span>
                        <span class="step-text">Abre tu terminal e inicia KR-CLI</span>
                    </div>
                    <div class="auth-step">
                        <span class="step-num">2</span>
                        <span class="step-text">Inicia sesión con tu cuenta</span>
                    </div>
                    <div class="auth-step">
                        <span class="step-num">3</span>
                        <span class="step-text">Selecciona "Web H4ck3r" en el menú</span>
                    </div>
                </div>
                
                <div class="auth-gate-terminal">
                    <div class="term-header">
                        <span class="dot red"></span>
                        <span class="dot yellow"></span>
                        <span class="dot green"></span>
                    </div>
                    <div class="term-body">
                        <span class="prompt">$</span> kr-cli<br>
                        <span class="output">> Selecciona opción 15: Web H4ck3r</span>
                    </div>
                </div>
                
                <div class="auth-gate-actions">
                    <a href="index.html" class="btn-gate-home">← Volver al Inicio</a>
                    <a href="index.html#install" class="btn-gate-install">Instalar KR-CLI</a>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .auth-gate-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }
        
        .auth-gate-content {
            background: #0d0d0d;
            border: 2px solid #0066FF;
            border-radius: 20px;
            padding: 50px 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 0 50px rgba(0, 102, 255, 0.3);
        }
        
        .auth-gate-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        .auth-gate-content h2 {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.8rem;
            margin-bottom: 15px;
            color: #fff;
        }
        
        .auth-gate-content p {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 30px;
        }
        
        .auth-gate-content strong {
            color: #00FFFF;
        }
        
        .auth-gate-steps {
            text-align: left;
            margin-bottom: 30px;
        }
        
        .auth-step {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .step-num {
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #0066FF, #00FFFF);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.85rem;
            color: #000;
        }
        
        .step-text {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.95rem;
        }
        
        .auth-gate-terminal {
            background: #0a0a0a;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 30px;
            text-align: left;
        }
        
        .term-header {
            background: #1a1a1a;
            padding: 8px 12px;
            display: flex;
            gap: 6px;
        }
        
        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        
        .dot.red { background: #ff5f56; }
        .dot.yellow { background: #ffbd2e; }
        .dot.green { background: #27c93f; }
        
        .term-body {
            padding: 20px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            line-height: 1.8;
        }
        
        .prompt {
            color: #00FFFF;
        }
        
        .output {
            color: rgba(255, 255, 255, 0.6);
        }
        
        .auth-gate-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn-gate-home, .btn-gate-install {
            padding: 12px 25px;
            border-radius: 5px;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            transition: all 0.3s ease;
        }
        
        .btn-gate-home {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 0.7);
        }
        
        .btn-gate-home:hover {
            border-color: #00FFFF;
            color: #00FFFF;
        }
        
        .btn-gate-install {
            background: linear-gradient(135deg, #0066FF, #00FFFF);
            color: #000;
            border: none;
        }
        
        .btn-gate-install:hover {
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);
}

/**
 * Update UI based on auth state
 */
function updateAuthUI() {
    const dashboardLink = document.getElementById('dashboard-link');

    if (currentUser) {
        // User is logged in
        if (dashboardLink) {
            dashboardLink.textContent = currentUser.username || currentUser.email.split('@')[0];
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
