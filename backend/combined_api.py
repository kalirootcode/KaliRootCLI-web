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
            'health': '/health'
        }
    }

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
