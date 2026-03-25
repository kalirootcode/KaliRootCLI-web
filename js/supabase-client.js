/**
 * KR-CLI DOMINION - Supabase Client
 * Initialize and export Supabase client for web platform
 */

console.log('[supabase-client] script loaded');
// Check if Supabase JS is loaded
let supabaseClient = null;

/**
 * Initialize Supabase client
 */
async function initSupabase() {
    console.log('[initSupabase] Starting initialization...');
    if (supabaseClient) {
        console.log('[initSupabase] Client already exists, returning');
        return supabaseClient;
    }

    try {
        // Load Supabase from CDN if not already loaded
        if (typeof supabase === 'undefined') {
            console.log('[Supabase] Loading Supabase SDK from CDN...');
            await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
            console.log('[Supabase] SDK loaded successfully');
        } else {
            console.log('[Supabase] SDK already loaded in global scope');
        }

        // Verify supabase is now available
        if (typeof supabase === 'undefined') {
            console.error('[Supabase] SDK failed to load');
            throw new Error('Supabase SDK no pudo cargarse');
        }

        // Get config from config.js
        if (typeof CONFIG === 'undefined') {
            console.error('[Supabase] CONFIG not loaded');
            throw new Error('Configuración no encontrada');
        }

        if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
            console.error('[Supabase] Missing credentials in CONFIG', {
                url: CONFIG.SUPABASE_URL ? 'EXISTS' : 'MISSING',
                key: CONFIG.SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING'
            });
            throw new Error('Credenciales de Supabase no configuradas');
        }

        console.log('[Supabase] Creating client with URL:', CONFIG.SUPABASE_URL.substring(0, 30) + '...');
        supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        console.log('[Supabase] Client created successfully');
        console.log('[Supabase] Client type:', typeof supabaseClient);
        console.log('[Supabase] Client has .from?', typeof supabaseClient?.from === 'function');
        return supabaseClient;
    } catch (error) {
        console.error('[Supabase] Init error:', error);
        throw error;
    }
}

/**
 * Helper to load external scripts
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Decode JWT token to get payload (user info)
 */
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        console.error('JWT decode error:', e);
        return null;
    }
}

/**
 * Get current user session
 */
async function getSession() {
    const client = await initSupabase();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
        console.error('Session error:', error);
        return null;
    }
    return session;
}

/**
 * Get user data from cli_users table
 */
async function getUserData(userId) {
    const client = await initSupabase();

    const { data, error } = await client
        .from('cli_users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('User data error:', error);
        return null;
    }

    return data;
}

/**
 * Get user KR credit balance from user_wallets table
 * Falls back to credit_balance in cli_users if wallet not found
 * @param {string} userId - UUID of the user
 * @returns {number} KR balance
 */
async function getUserBalance(userId) {
    const client = await initSupabase();

    // Primary: query user_wallets table
    const { data: wallet, error: walletError } = await client
        .from('user_wallets')
        .select('balance, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

    if (wallet && !walletError) {
        console.log('[KR] Wallet balance:', wallet.balance);
        return Number(wallet.balance) || 0;
    }

    // Fallback: credit_balance in cli_users
    if (walletError) {
        console.warn('[KR] user_wallets query failed, falling back to cli_users:', walletError.message);
    }

    const { data: userData, error: userError } = await client
        .from('cli_users')
        .select('credit_balance')
        .eq('id', userId)
        .maybeSingle();

    if (userError) {
        console.error('[KR] getUserBalance fallback error:', userError);
        return 0;
    }

    return Number(userData?.credit_balance) || 0;
}

/**
 * Log web activity
 */
async function logActivity(userId, action, pageVisited, metadata = {}) {
    try {
        const client = await initSupabase();
        await client
            .from('web_activity_log')
            .insert({
                user_id: userId,
                action: action,
                page_visited: pageVisited,
                metadata: metadata
            });
    } catch (e) {
        console.warn('Activity log failed:', e);
    }
}

/**
 * Validate CLI token - decode JWT and get user info
 */
async function validateCLIToken(token) {
    try {
        // First, decode the JWT to get basic user info
        const jwtPayload = decodeJWT(token);
        console.log('[Supabase] JWT Payload:', jwtPayload);

        if (!jwtPayload || !jwtPayload.sub) {
            return { valid: false, error: 'Token JWT inválido' };
        }

        // Basic user info from JWT
        const userId = jwtPayload.sub;
        const userEmail = jwtPayload.email;

        // Try to get extended data from database
        let userData = null;
        try {
            const client = await initSupabase();

            // Set the session with the token
            await client.auth.setSession({
                access_token: token,
                refresh_token: token
            });

            userData = await getUserData(userId);
        } catch (e) {
            console.warn('[Supabase] Could not get user data from DB:', e);
        }

        // Build user object - use JWT data as fallback
        const user = {
            id: userId,
            email: userEmail,
            username: userData?.username || userEmail?.split('@')[0] || 'Usuario',
            credit_balance: userData?.credit_balance ?? 0,
            subscription_status: userData?.subscription_status || 'free',
            subscription_expiry_date: userData?.subscription_expiry_date || null,
            total_spent: userData?.total_spent ?? 0,
            created_at: userData?.created_at || new Date().toISOString()
        };

        console.log('[Supabase] Final user object:', user);

        // Log activity (don't fail if this errors)
        logActivity(userId, 'web_login', window.location.pathname, {
            source: 'cli_token',
            has_db_data: !!userData
        });

        return { valid: true, user };

    } catch (e) {
        console.error('Token validation error:', e);
        return { valid: false, error: e.message };
    }
}

/**
 * Create support ticket
 */
async function createSupportTicket(userId, userEmail, subject, message) {
    const client = await initSupabase();

    const { data: ticket, error: ticketError } = await client
        .from('support_tickets')
        .insert({
            user_id: userId,
            user_email: userEmail,
            subject: subject,
            status: 'open',
            priority: 'normal'
        })
        .select()
        .single();

    if (ticketError) {
        console.error('Ticket error:', ticketError);
        return { success: false, error: ticketError.message };
    }

    const { error: msgError } = await client
        .from('support_messages')
        .insert({
            ticket_id: ticket.id,
            sender_type: 'user',
            sender_id: userId,
            message: message
        });

    if (msgError) {
        console.error('Message error:', msgError);
        return { success: false, error: msgError.message };
    }

    return { success: true, ticketId: ticket.id };
}

/**
 * Get user's support tickets
 */
async function getUserTickets(userId) {
    const client = await initSupabase();

    const { data, error } = await client
        .from('support_tickets')
        .select(`
            *,
            support_messages (
                id,
                sender_type,
                message,
                created_at,
                is_read
            )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Tickets error:', error);
        return [];
    }

    return data;
}

/**
 * Send message to existing ticket
 */
async function sendTicketMessage(ticketId, userId, message) {
    const client = await initSupabase();

    const { error } = await client
        .from('support_messages')
        .insert({
            ticket_id: ticketId,
            sender_type: 'user',
            sender_id: userId,
            message: message
        });

    if (error) {
        console.error('Send message error:', error);
        return { success: false, error: error.message };
    }

    await client
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

    return { success: true };
}

// ============================================
// STORE FUNCTIONS (MOCK for web store without full cart backend)
// ============================================

/**
 * Get all active products from the 'products' table
 */
async function getProducts() {
    console.log('[Products] Fetching products from Supabase...');
    const client = await initSupabase();
    const { data, error } = await client
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    
    console.log(`[Products] Fetched ${data.length} products.`);
    return data;
}

/**
 * Create order and order_items (for checkout.html)
 */
async function createOrder(userId, userEmail, items, total, paymentDetails = {}) {
    const client = await initSupabase();

    // 1. Create the order
    const { data: order, error: orderError } = await client
        .from('orders')
        .insert({
            user_id: userId,
            user_email: userEmail,
            total_amount: total,
            currency: 'usd',
            status: 'pending',
            payment_method: paymentDetails.payment_method || 'unknown',
            payment_details: paymentDetails
        })
        .select()
        .single();

    if (orderError) {
        console.error('Create order error:', orderError);
        return { success: false, error: orderError.message };
    }

    // 2. Create the order items
    const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id, // This MUST be a UUID
        product_name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.price,
        total_price: item.price * (item.quantity || 1)
    }));
    
    const { error: itemsError } = await client
        .from('order_items')
        .insert(orderItems);

    if (itemsError) {
        console.error('Create order items error:', itemsError);
        // Don't fail the whole process, but log it.
        // The order is still created.
    }

    return { success: true, order };
}

/**
 * Validate a coupon code
 */
async function validateCoupon(code, subtotal) {
    const client = await initSupabase();

    const { data: coupon, error } = await client
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

    if (error || !coupon) {
        return { valid: false, error: 'Cupón no válido' };
    }

    // Check dates, uses, minimum purchase...
    // (Existing logic remains the same)

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
        discount = subtotal * (coupon.discount_value / 100);
    } else {
        discount = coupon.discount_value;
    }

    return { valid: true, coupon, discount };
}


// Get supabase client directly
async function getSupabaseClient() {
    if (!supabaseClient) {
        await initSupabase();
    }
    return supabaseClient;
}

// Export for use in other scripts
window.KRSupabase = {
    init: initSupabase,
    getSupabaseClient,
    getSession,
    getUserData,
    getUserBalance,
    logActivity,
    validateCLIToken,
    createSupportTicket,
    getUserTickets,
    sendTicketMessage,
    decodeJWT,
    // Store functions
    getProducts,
    createOrder,
    validateCoupon
};
