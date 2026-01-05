/**
 * KR-CLI DOMINION - Supabase Client
 * Initialize and export Supabase client for web platform
 */

// Supabase configuration (same as CLI)
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Check if Supabase JS is loaded
let supabaseClient = null;

/**
 * Initialize Supabase client
 * We use the CDN version for static hosting
 */
async function initSupabase() {
    if (supabaseClient) return supabaseClient;

    // Load Supabase from CDN if not already loaded
    if (typeof supabase === 'undefined') {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    }

    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
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
 * Log web activity
 */
async function logActivity(userId, action, pageVisited, metadata = {}) {
    const client = await initSupabase();

    await client
        .from('web_activity_log')
        .insert({
            user_id: userId,
            action: action,
            page_visited: pageVisited,
            metadata: metadata
        });
}

/**
 * Create or update web session from CLI token
 */
async function validateCLIToken(token) {
    const client = await initSupabase();

    // Verify token with Supabase
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
        return { valid: false, error: 'Token inválido o expirado' };
    }

    // Get user data
    const userData = await getUserData(user.id);

    if (!userData) {
        return { valid: false, error: 'Usuario no encontrado' };
    }

    // Log web session
    await logActivity(user.id, 'web_login', window.location.pathname, {
        source: 'cli_token',
        user_agent: navigator.userAgent
    });

    return {
        valid: true,
        user: {
            id: user.id,
            email: user.email,
            ...userData
        }
    };
}

/**
 * Create support ticket
 */
async function createSupportTicket(userId, userEmail, subject, message) {
    const client = await initSupabase();

    // Create ticket
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

    // Add first message
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

    // Update ticket timestamp
    await client
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

    return { success: true };
}

// Export for use in other scripts
window.KRSupabase = {
    init: initSupabase,
    getSession,
    getUserData,
    logActivity,
    validateCLIToken,
    createSupportTicket,
    getUserTickets,
    sendTicketMessage
};
