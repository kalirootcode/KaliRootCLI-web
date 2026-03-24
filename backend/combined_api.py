#!/usr/bin/env python3
"""
Combined API for Render Deployment
Runs both News Aggregator and Education API in a single service
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS

# Import the apps
import sys

sys.path.insert(0, os.path.dirname(__file__))

from news_aggregator import app as news_app, update_news_cache
from education_api import app as education_app

# --- PayPal Imports & Config ---
import requests
import hmac
import hashlib
import json
from datetime import datetime, timedelta

PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET")
PAYPAL_API_BASE = (
    "https://api-m.sandbox.paypal.com"  # Use "https://api-m.paypal.com" for production
)

# Supabase config (re-defined here for clarity with PayPal section)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
IPN_SECRET_KEY = os.environ.get("IPN_SECRET_KEY", "")

# Create combined app
app = Flask(__name__)
CORS(app)


# Register blueprints with prefixes
# News API routes
@app.route("/api/news", methods=["GET"])
def get_news():
    with news_app.app_context():
        return news_app.view_functions["get_news"]()


@app.route("/api/news/category/<category>", methods=["GET"])
def get_news_by_category(category):
    with news_app.app_context():
        return news_app.view_functions["get_news_by_category"](category)


@app.route("/api/news/search", methods=["GET"])
def search_news():
    with news_app.app_context():
        return news_app.view_functions["search_news_endpoint"]()


@app.route("/api/categories", methods=["GET"])
def get_categories():
    with news_app.app_context():
        return news_app.view_functions["get_categories"]()


# Education API routes
@app.route("/api/education/courses", methods=["GET"])
def get_courses():
    with education_app.app_context():
        return education_app.view_functions["get_courses"]()


@app.route("/api/education/course/<course_id>", methods=["GET"])
def get_course(course_id):
    with education_app.app_context():
        return education_app.view_functions["get_course"](course_id)


@app.route("/api/education/lab/<lab_id>", methods=["GET"])
def get_lab(lab_id):
    with education_app.app_context():
        return education_app.view_functions["get_lab"](lab_id)


@app.route("/api/education/stats", methods=["GET"])
def get_stats():
    with education_app.app_context():
        return education_app.view_functions["get_stats"]()


# Health check
@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_check():
    return {"status": "healthy", "services": {"news": "active", "education": "active"}}


# Root endpoint
@app.route("/")
def root():
    return {
        "name": "KR-CLI Educational Platform API",
        "version": "1.0.0",
        "endpoints": {
            "news": "/api/news",
            "education": "/api/education/courses",
            "health": "/health",
            "nowpayments_webhook": "/api/nowpayments-webhook",
        },
    }


# ============================================
# NOWPayments Webhook Handler (existing logic)
# ============================================


def verify_nowpayments_signature(payload, signature):
    """Verify IPN callback signature from NOWPayments"""
    if not IPN_SECRET_KEY:
        return False

    sorted_payload = dict(sorted(payload.items()))
    payload_string = json.dumps(sorted_payload, separators=(",", ":"))

    calculated_sig = hmac.new(
        IPN_SECRET_KEY.encode(), payload_string.encode(), hashlib.sha512
    ).hexdigest()

    return hmac.compare_digest(calculated_sig, signature)


def update_order_status(order_id, status, payment_id=None):
    """Update order status in Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Supabase credentials not configured")
        return False

    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }

        data = {"status": status}
        if payment_id:
            data["payment_id"] = payment_id
        if status == "completed":
            data["completed_at"] = datetime.utcnow().isoformat()

        response = requests.patch(
            f"{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}",
            headers=headers,
            json=data,
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
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }

        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/order_items?order_id=eq.{order_id}&select=product_id",
            headers=headers,
        )

        if response.status_code != 200:
            return False

        items = response.json()
        expires_at = (datetime.utcnow() + timedelta(days=365)).isoformat()

        downloads = [
            {
                "user_id": user_id,
                "product_id": item["product_id"],
                "order_id": order_id,
                "expires_at": expires_at,
            }
            for item in items
        ]

        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_downloads",
            headers={**headers, "Prefer": "resolution=merge-duplicates"},
            json=downloads,
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
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        now = datetime.utcnow().isoformat()

        upsert_payload = {"user_id": user_id, "balance": kr_amount, "updated_at": now}
        upsert_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/user_wallets",
            headers={
                **headers,
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
            json=upsert_payload,
        )

        if upsert_resp.status_code in [200, 201]:
            print(f"✅ KR wallet upserted: +{kr_amount} KR for user {user_id}")
        else:
            print(f"⚠️ Upsert failed ({upsert_resp.status_code}), trying increment...")

        read_resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_wallets?user_id=eq.{user_id}&select=balance",
            headers=headers,
        )
        if read_resp.status_code == 200 and read_resp.json():
            current = read_resp.json()[0].get("balance", 0) or 0
            new_balance = current + kr_amount

            patch_resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/user_wallets?user_id=eq.{user_id}",
                headers=headers,
                json={"balance": new_balance, "updated_at": now},
            )
            if patch_resp.status_code in [200, 204]:
                print(
                    f"✅ KR credited: {current} → {new_balance} KR for user {user_id}"
                )
            else:
                print(f"❌ KR patch failed: {patch_resp.status_code} {patch_resp.text}")
                return False
        else:
            print(f"✅ New KR wallet created with {kr_amount} KR for user {user_id}")

        requests.post(
            f"{SUPABASE_URL}/rest/v1/kr_transactions",
            headers=headers,
            json={
                "user_id": user_id,
                "amount": kr_amount,
                "type": "purchase",
                "order_id": order_id,
                "payment_id": payment_id,
                "created_at": now,
            },
        )  # Non-blocking — table may not exist yet, ignore errors

        return True
    except Exception as e:
        print(f"❌ Error crediting KR: {e}")
        return False


@app.route("/api/nowpayments-webhook", methods=["POST"])
def nowpayments_webhook():
    """Handle NOWPayments IPN callbacks"""
    try:
        signature = request.headers.get("x-nowpayments-sig", "")
        payload = request.get_json()

        if not payload:
            return {"error": "No payload"}, 400

        if IPN_SECRET_KEY and signature:
            if not verify_nowpayments_signature(payload, signature):
                print("⚠️ Invalid NOWPayments signature")
                return {"error": "Invalid signature"}, 401

        payment_status = payload.get("payment_status", "")
        order_id = payload.get("order_id", "")
        payment_id = str(payload.get("payment_id", ""))

        print(f"📨 NOWPayments webhook: order={order_id}, status={payment_status}")

        status_map = {
            "waiting": "pending",
            "confirming": "processing",
            "confirmed": "processing",
            "sending": "processing",
            "partially_paid": "processing",
            "finished": "completed",
            "failed": "failed",
            "refunded": "refunded",
            "expired": "cancelled",
        }

        our_status = status_map.get(payment_status, "pending")

        if order_id:
            update_order_status(order_id, our_status, payment_id)

            if our_status == "completed":
                headers = {
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                }
                response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}&select=user_id,payment_details",
                    headers=headers,
                )
                if response.status_code == 200 and response.json():
                    order_data = response.json()[0]
                    user_id = order_data.get("user_id")
                    payment_details = order_data.get("payment_details") or {}

                    kr_amount = None
                    if isinstance(payment_details, dict):
                        kr_amount = payment_details.get("kr_amount")

                    if kr_amount and user_id:
                        kr_amount = int(kr_amount)
                        print(
                            f"💚 Crediting {kr_amount} KR to user {user_id} (order {order_id})"
                        )
                        credit_kr_purchase(user_id, kr_amount, order_id, payment_id)
                    else:
                        if user_id:
                            create_user_downloads(order_id, user_id)

        return {"status": "ok"}, 200

    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {"error": str(e)}, 500


# ============================================
# PayPal Integration
# ============================================


def get_paypal_access_token():
    """Get access token from PayPal."""
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        print("❌ PayPal client ID or secret not set.")
        return None
    try:
        auth = (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
        data = {"grant_type": "client_credentials"}
        headers = {"Accept": "application/json", "Accept-Language": "en_US"}
        response = requests.post(
            f"{PAYPAL_API_BASE}/v1/oauth2/token", auth=auth, data=data, headers=headers
        )
        response.raise_for_status()
        return response.json()["access_token"]
    except requests.exceptions.HTTPError as err:
        print(f"❌ PayPal token error: {err.response.text}")
        return None
    except Exception as e:
        print(f"❌ PayPal token exception: {e}")
        return None


@app.route("/api/paypal/create-order", methods=["POST"])
def create_paypal_order():
    """Create a PayPal order and return the order ID."""
    try:
        data = request.get_json()
        product_id = data.get("product_id")
        user_id = data.get("user_id")

        print(
            f"🔔 PayPal create-order called - PAYPAL_CLIENT_ID set: {bool(PAYPAL_CLIENT_ID)}, PAYPAL_CLIENT_SECRET set: {bool(PAYPAL_CLIENT_SECRET)}"
        )

        products_db = {
            "curso-python": {
                "name": "Curso de Pentesting con Python",
                "price": "49.99",
            },
            "ebook-reversing": {
                "name": "Ebook de Ingeniería Inversa",
                "price": "29.99",
            },
            "kr-scanner": {"name": "KR-Scanner Pro", "price": "99.99"},
        }

        cart_items = data.get("cart_items", [])

        if cart_items:
            total = sum(item.get("price", 0) for item in cart_items)
            description = ", ".join(
                [item.get("name", "Producto") for item in cart_items]
            )
            product = {"name": description, "price": f"{total:.2f}"}
        elif product_id:
            product = products_db.get(product_id)
        else:
            return jsonify({"error": "Producto no encontrado"}), 404

        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        access_token = get_paypal_access_token()
        if not access_token:
            print(
                "❌ PayPal access token failed - check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Render"
            )
            return jsonify(
                {"error": "PayPal no configurado. Contacta al administrador."}
            ), 500

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {"currency_code": "USD", "value": product["price"]},
                    "description": product["name"][:127],
                }
            ],
        }

        response = requests.post(
            f"{PAYPAL_API_BASE}/v2/checkout/orders", headers=headers, json=payload
        )
        response.raise_for_status()

        paypal_order = response.json()
        paypal_order_id = paypal_order["id"]

        # Create order in Supabase
        if SUPABASE_URL and SUPABASE_KEY and user_id:
            try:
                headers_db = {
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                }

                order_data = {
                    "user_id": user_id,
                    "total_amount": float(product["price"]),
                    "currency": "USD",
                    "status": "pending",
                    "payment_method": "paypal",
                    "payment_id": paypal_order_id,
                    "payment_details": {
                        "paypal_order_id": paypal_order_id,
                        "cart_items": cart_items,
                        "product_id": product_id,
                    },
                }

                resp = requests.post(
                    f"{SUPABASE_URL}/rest/v1/orders",
                    headers=headers_db,
                    json=order_data,
                )

                if resp.status_code in [200, 201]:
                    supabase_order = resp.json()
                    supabase_order_id = (
                        supabase_order[0].get("id")
                        if isinstance(supabase_order, list)
                        else supabase_order.get("id")
                    )
                    print(f"✅ Order created in Supabase: {supabase_order_id}")
                else:
                    print(f"⚠️ Could not create order in Supabase: {resp.status_code}")
                    supabase_order_id = None
            except Exception as e:
                print(f"⚠️ Error creating order in Supabase: {e}")
                supabase_order_id = None
        else:
            supabase_order_id = None

        return jsonify(
            {"orderID": paypal_order_id, "supabase_order_id": supabase_order_id}
        )

    except requests.exceptions.HTTPError as err:
        print(f"❌ PayPal create order error: {err.response.text}")
        return jsonify({"error": str(err)}), 500
    except Exception as e:
        print(f"❌ PayPal create order exception: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/paypal/capture-order", methods=["POST"])
def capture_paypal_order():
    """Capture a PayPal order and fulfill the purchase."""
    try:
        data = request.get_json()
        order_id = data.get("orderID")
        supabase_order_id = data.get("supabase_order_id")
        user_id = data.get("user_id")
        cart_items = data.get("cart_items", [])

        if not order_id:
            return jsonify({"error": "Order ID requerido"}), 400

        access_token = get_paypal_access_token()
        if not access_token:
            return jsonify({"error": "Authentication failed"}), 500

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        }

        capture_url = f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture"
        response = requests.post(capture_url, headers=headers)
        response.raise_for_status()

        capture_data = response.json()

        if capture_data.get("status") == "COMPLETED":
            print(f"✅ Pago de PayPal completado: {order_id}")

            # Update order in Supabase
            if SUPABASE_URL and SUPABASE_KEY and supabase_order_id:
                try:
                    headers_db = {
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                    }

                    # Get order to find user_id
                    get_resp = requests.get(
                        f"{SUPABASE_URL}/rest/v1/orders?id=eq.{supabase_order_id}&select=user_id,payment_details",
                        headers=headers_db,
                    )

                    if get_resp.status_code == 200 and get_resp.json():
                        order_data = get_resp.json()[0]
                        user_id = user_id or order_data.get("user_id")
                        payment_details = order_data.get("payment_details", {})
                        cart_items = cart_items or payment_details.get("cart_items", [])

                    # Update order status
                    update_resp = requests.patch(
                        f"{SUPABASE_URL}/rest/v1/orders?id=eq.{supabase_order_id}",
                        headers=headers_db,
                        json={
                            "status": "completed",
                            "completed_at": datetime.utcnow().isoformat(),
                        },
                    )

                    # Create user downloads for each product
                    if user_id:
                        for item in cart_items:
                            download_entry = {
                                "user_id": user_id,
                                "product_id": item.get("id"),
                                "order_id": supabase_order_id,
                                "expires_at": (
                                    datetime.utcnow() + timedelta(days=365)
                                ).isoformat(),
                            }
                            requests.post(
                                f"{SUPABASE_URL}/rest/v1/user_downloads",
                                headers={
                                    **headers_db,
                                    "Prefer": "resolution=merge-duplicates",
                                },
                                json=download_entry,
                            )

                        print(f"✅ Descargas creadas para usuario {user_id}")

                    print(f"✅ Orden {supabase_order_id} marcada como completada")

                except Exception as e:
                    print(f"⚠️ Error actualizando orden en Supabase: {e}")

            return jsonify({"status": "success", "capture_data": capture_data})
        else:
            return jsonify(
                {"status": "pending", "message": "El pago no se ha completado."}
            ), 400

    except requests.exceptions.HTTPError as err:
        print(f"❌ PayPal capture error: {err.response.text}")
        return jsonify({"error": "Error al capturar el pago"}), 500
    except Exception as e:
        print(f"❌ PayPal capture exception: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("🚀 Starting Combined API Server...")

    print("📰 Pre-loading news cache...")
    try:
        update_news_cache()
    except Exception as e:
        print(f"⚠️ Could not pre-load news: {e}")

    port = int(os.environ.get("PORT", 10000))

    print(f"✅ Server starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
