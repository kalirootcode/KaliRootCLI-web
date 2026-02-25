#!/usr/bin/env python3
"""
Combined API for Render Deployment
Runs both News Aggregator and Education API in a single service
"""

import os
from flask import Flask
from flask_cors import CORS

# Import the apps
import sys
sys.path.insert(0, os.path.dirname(__file__))

from news_aggregator import app as news_app, update_news_cache
from education_api import app as education_app

# Create combined app
app = Flask(__name__)
CORS(app)

# Register blueprints with prefixes
# News API routes
@app.route('/api/news', methods=['GET'])
def get_news():
    with news_app.app_context():
        return news_app.view_functions['get_news']()

@app.route('/api/news/category/<category>', methods=['GET'])
def get_news_by_category(category):
    with news_app.app_context():
        return news_app.view_functions['get_news_by_category'](category)

@app.route('/api/news/search', methods=['GET'])
def search_news():
    with news_app.app_context():
        return news_app.view_functions['search_news_endpoint']()

@app.route('/api/categories', methods=['GET'])
def get_categories():
    with news_app.app_context():
        return news_app.view_functions['get_categories']()

# Education API routes
@app.route('/api/education/courses', methods=['GET'])
def get_courses():
    with education_app.app_context():
        return education_app.view_functions['get_courses']()

@app.route('/api/education/course/<course_id>', methods=['GET'])
def get_course(course_id):
    with education_app.app_context():
        return education_app.view_functions['get_course'](course_id)

@app.route('/api/education/lab/<lab_id>', methods=['GET'])
def get_lab(lab_id):
    with education_app.app_context():
        return education_app.view_functions['get_lab'](lab_id)

@app.route('/api/education/stats', methods=['GET'])
def get_stats():
    with education_app.app_context():
        return education_app.view_functions['get_stats']()

# Health check
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    return {
        'status': 'healthy',
        'services': {
            'news': 'active',
            'education': 'active'
        }
    }

# Root endpoint
@app.route('/')
def root():
    return {
        'name': 'KR-CLI Educational Platform API',
        'version': '1.0.0',
        'endpoints': {
            'news': '/api/news',
            'education': '/api/education/courses',
            'health': '/health',
            'nowpayments_webhook': '/api/nowpayments-webhook'
        }
    }

# ============================================
# NOWPayments Webhook Handler
# ============================================
import hmac
import hashlib
import json
from flask import request

# Get IPN secret from environment
NOWPAYMENTS_IPN_SECRET = os.environ.get('NOWPAYMENTS_IPN_SECRET', '')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

def verify_nowpayments_signature(payload, signature):
    """Verify IPN callback signature from NOWPayments"""
    if not NOWPAYMENTS_IPN_SECRET:
        return False
    
    # Sort payload and create string
    sorted_payload = dict(sorted(payload.items()))
    payload_string = json.dumps(sorted_payload, separators=(',', ':'))
    
    # Create HMAC
    calculated_sig = hmac.new(
        NOWPAYMENTS_IPN_SECRET.encode(),
        payload_string.encode(),
        hashlib.sha512
    ).hexdigest()
    
    return hmac.compare_digest(calculated_sig, signature)

def update_order_status(order_id, status, payment_id=None):
    """Update order status in Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Supabase credentials not configured")
        return False
    
    try:
        import requests
        
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        data = {'status': status}
        if payment_id:
            data['payment_id'] = payment_id
        if status == 'completed':
            from datetime import datetime
            data['completed_at'] = datetime.utcnow().isoformat()
        
        response = requests.patch(
            f'{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}',
            headers=headers,
            json=data
        )
        
        return response.status_code == 200 or response.status_code == 204
    except Exception as e:
        print(f"❌ Error updating order: {e}")
        return False

def create_user_downloads(order_id, user_id):
    """Create download entries for completed order"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    
    try:
        import requests
        from datetime import datetime, timedelta
        
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Get order items
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/order_items?order_id=eq.{order_id}&select=product_id',
            headers=headers
        )
        
        if response.status_code != 200:
            return False
        
        items = response.json()
        expires_at = (datetime.utcnow() + timedelta(days=365)).isoformat()
        
        # Create downloads
        downloads = [
            {
                'user_id': user_id,
                'product_id': item['product_id'],
                'order_id': order_id,
                'expires_at': expires_at
            }
            for item in items
        ]
        
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/user_downloads',
            headers={**headers, 'Prefer': 'resolution=merge-duplicates'},
            json=downloads
        )
        
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"❌ Error creating downloads: {e}")
        return False


def credit_kr_purchase(user_id, kr_amount, order_id, payment_id):
    """
    Add KR credits to user_wallets after a confirmed KR package purchase.
    Uses an upsert to create the wallet row if it doesn't exist yet,
    then increments the balance with a secondary UPDATE + returning.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Supabase credentials not configured for KR credit")
        return False
    
    try:
        import requests
        from datetime import datetime

        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

        now = datetime.utcnow().isoformat()

        # 1. Try to upsert the wallet row (create if not exists)
        upsert_payload = {
            'user_id': user_id,
            'balance': kr_amount,
            'updated_at': now
        }
        upsert_resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/user_wallets',
            headers={**headers, 'Prefer': 'resolution=merge-duplicates,return=representation'},
            json=upsert_payload
        )

        if upsert_resp.status_code in [200, 201]:
            # Upsert created a new row — balance is already set, done
            print(f"✅ KR wallet upserted: +{kr_amount} KR for user {user_id}")
        else:
            print(f"⚠️ Upsert failed ({upsert_resp.status_code}), trying increment...")

        # 2. Increment balance for existing wallet using RPC if available,
        #    or patch with a read-modify-write (safe for low concurrency)
        read_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_wallets?user_id=eq.{user_id}&select=balance',
            headers=headers
        )
        if read_resp.status_code == 200 and read_resp.json():
            current = read_resp.json()[0].get('balance', 0) or 0
            new_balance = current + kr_amount

            patch_resp = requests.patch(
                f'{SUPABASE_URL}/rest/v1/user_wallets?user_id=eq.{user_id}',
                headers=headers,
                json={'balance': new_balance, 'updated_at': now}
            )
            if patch_resp.status_code in [200, 204]:
                print(f"✅ KR credited: {current} → {new_balance} KR for user {user_id}")
            else:
                print(f"❌ KR patch failed: {patch_resp.status_code} {patch_resp.text}")
                return False
        else:
            # Row was just created by upsert
            print(f"✅ New KR wallet created with {kr_amount} KR for user {user_id}")

        # 3. Log the credit transaction
        requests.post(
            f'{SUPABASE_URL}/rest/v1/kr_transactions',
            headers=headers,
            json={
                'user_id': user_id,
                'amount': kr_amount,
                'type': 'purchase',
                'order_id': order_id,
                'payment_id': payment_id,
                'created_at': now
            }
        )  # Non-blocking — table may not exist yet, ignore errors

        return True
    except Exception as e:
        print(f"❌ Error crediting KR: {e}")
        return False

@app.route('/api/nowpayments-webhook', methods=['POST'])
def nowpayments_webhook():
    """Handle NOWPayments IPN callbacks"""
    try:
        # Get signature from header
        signature = request.headers.get('x-nowpayments-sig', '')
        
        # Get payload
        payload = request.get_json()
        
        if not payload:
            return {'error': 'No payload'}, 400
        
        # Verify signature (optional but recommended)
        if NOWPAYMENTS_IPN_SECRET and signature:
            if not verify_nowpayments_signature(payload, signature):
                print("⚠️ Invalid NOWPayments signature")
                return {'error': 'Invalid signature'}, 401
        
        # Extract data
        payment_status = payload.get('payment_status', '')
        order_id = payload.get('order_id', '')
        payment_id = str(payload.get('payment_id', ''))
        
        print(f"📨 NOWPayments webhook: order={order_id}, status={payment_status}")
        
        # Map NOWPayments status to our status
        status_map = {
            'waiting': 'pending',
            'confirming': 'processing',
            'confirmed': 'processing',
            'sending': 'processing',
            'partially_paid': 'processing',
            'finished': 'completed',
            'failed': 'failed',
            'refunded': 'refunded',
            'expired': 'cancelled'
        }
        
        our_status = status_map.get(payment_status, 'pending')
        
        # Update order status
        if order_id:
            update_order_status(order_id, our_status, payment_id)
            
            # If completed, handle fulfillment
            if our_status == 'completed':
                import requests
                headers = {
                    'apikey': SUPABASE_KEY,
                    'Authorization': f'Bearer {SUPABASE_KEY}'
                }
                # Get order details (user_id + payment_details for KR amount)
                response = requests.get(
                    f'{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}&select=user_id,payment_details',
                    headers=headers
                )
                if response.status_code == 200 and response.json():
                    order_data = response.json()[0]
                    user_id = order_data.get('user_id')
                    payment_details = order_data.get('payment_details') or {}

                    # ── KR Credits purchase? ──
                    kr_amount = None
                    # Check payment_details for kr_amount (set when checkout.html builds the order)
                    if isinstance(payment_details, dict):
                        kr_amount = payment_details.get('kr_amount')

                    if kr_amount and user_id:
                        kr_amount = int(kr_amount)
                        print(f"💚 Crediting {kr_amount} KR to user {user_id} (order {order_id})")
                        credit_kr_purchase(user_id, kr_amount, order_id, payment_id)
                    else:
                        # Regular product order — create download links
                        if user_id:
                            create_user_downloads(order_id, user_id)
        
        return {'status': 'ok'}, 200
        
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {'error': str(e)}, 500

if __name__ == '__main__':
    print("🚀 Starting Combined API Server...")
    
    # Pre-load news cache
    print("📰 Pre-loading news cache...")
    try:
        update_news_cache()
    except Exception as e:
        print(f"⚠️ Could not pre-load news: {e}")
    
    # Get port from environment (Render sets this)
    port = int(os.environ.get('PORT', 10000))
    
    print(f"✅ Server starting on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
