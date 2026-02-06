/**
 * KR-CLI DOMINION - Configuration
 * Generated automatically from environment variables
 */

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: "https://cvesmbgevcyrdbbftwvy.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZXNtYmdldmN5cmRiYmZ0d3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzkyMTUsImV4cCI6MjA4MTA1NTIxNX0.FavKlhkCXj3iE0kHBGbQWfN86LVTUThBP0t40NacpPs",

    // NOWPayments Configuration
    // Get your API key from: https://nowpayments.io/
    // 1. Create account at nowpayments.io
    // 2. Go to Store Settings > API Keys
    // 3. Generate new API key and paste below
    NOWPAYMENTS_API_KEY: "YOUR_NOWPAYMENTS_API_KEY", // <-- REPLACE THIS
    NOWPAYMENTS_IPN_SECRET: "YOUR_IPN_SECRET_KEY",   // <-- REPLACE THIS
    NOWPAYMENTS_API_URL: "https://api.nowpayments.io/v1"
};

// Export for usage in other scripts
window.CONFIG = CONFIG;

