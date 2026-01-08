#!/usr/bin/env python3
"""
KR-CLI News Aggregator
Sistema de agregación de noticias de ciberseguridad usando DDGS y AI
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from flask import Flask, jsonify, request
from flask_cors import CORS
from duckduckgo_search import DDGS
import google.generativeai as genai
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
else:
    model = None
    print("⚠️ GEMINI_API_KEY no configurada. Resúmenes deshabilitados.")

# Configurar Flask
app = Flask(__name__)
CORS(app)

# Cache de noticias (en memoria)
news_cache = {
    'data': [],
    'timestamp': None,
    'ttl': 300  # 5 minutos
}

# Categorías de búsqueda
NEWS_CATEGORIES = {
    'vulnerabilities': [
        'CVE vulnerability cybersecurity',
        'zero-day exploit discovered',
        'security vulnerability patch'
    ],
    'exploits': [
        'exploit released cybersecurity',
        'proof of concept exploit',
        'metasploit module'
    ],
    'tools': [
        'cybersecurity tool released',
        'penetration testing tool',
        'hacking tool update'
    ],
    'breaches': [
        'data breach cybersecurity',
        'ransomware attack',
        'cyber attack news'
    ],
    'events': [
        'cybersecurity conference',
        'hacking competition CTF',
        'security researcher'
    ]
}


def search_news(query: str, max_results: int = 5) -> List[Dict]:
    """Busca noticias usando DuckDuckGo Search"""
    try:
        with DDGS() as ddgs:
            results = []
            # Buscar noticias de los últimos 7 días
            for result in ddgs.news(query, max_results=max_results):
                results.append({
                    'title': result.get('title', ''),
                    'url': result.get('url', ''),
                    'source': result.get('source', 'Unknown'),
                    'date': result.get('date', ''),
                    'body': result.get('body', '')
                })
            return results
    except Exception as e:
        print(f"❌ Error buscando noticias: {e}")
        return []


def summarize_and_translate(text: str, title: str) -> Dict[str, str]:
    """Resume y traduce noticias usando Gemini AI"""
    if not model:
        return {
            'summary_es': text[:200] + '...' if len(text) > 200 else text,
            'summary_en': text[:200] + '...' if len(text) > 200 else text
        }
    
    try:
        prompt = f"""Analiza esta noticia de ciberseguridad y proporciona:
1. Un resumen técnico en español (2-3 oraciones, máximo 150 palabras)
2. Un resumen técnico en inglés (2-3 oraciones, máximo 150 palabras)

Título: {title}
Contenido: {text}

Formato de respuesta (JSON):
{{
    "summary_es": "resumen en español aquí",
    "summary_en": "resumen en inglés aquí"
}}
"""
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Intentar parsear JSON
        if '```json' in result_text:
            result_text = result_text.split('```json')[1].split('```')[0].strip()
        elif '```' in result_text:
            result_text = result_text.split('```')[1].split('```')[0].strip()
        
        result = json.loads(result_text)
        return result
        
    except Exception as e:
        print(f"❌ Error en AI: {e}")
        return {
            'summary_es': text[:200] + '...' if len(text) > 200 else text,
            'summary_en': text[:200] + '...' if len(text) > 200 else text
        }


def aggregate_news(categories: Optional[List[str]] = None, max_per_category: int = 3) -> List[Dict]:
    """Agrega noticias de múltiples categorías"""
    if categories is None:
        categories = list(NEWS_CATEGORIES.keys())
    
    all_news = []
    seen_urls = set()
    
    for category in categories:
        if category not in NEWS_CATEGORIES:
            continue
        
        print(f"🔍 Buscando noticias de: {category}")
        
        for query in NEWS_CATEGORIES[category]:
            news = search_news(query, max_results=max_per_category)
            
            for item in news:
                url = item['url']
                if url in seen_urls:
                    continue
                
                seen_urls.add(url)
                
                # Resumir y traducir
                summaries = summarize_and_translate(item['body'], item['title'])
                
                all_news.append({
                    'id': hash(url),
                    'category': category,
                    'title': item['title'],
                    'url': url,
                    'source': item['source'],
                    'date': item['date'],
                    'summary_es': summaries['summary_es'],
                    'summary_en': summaries['summary_en'],
                    'original_body': item['body']
                })
                
                # Rate limiting
                time.sleep(0.5)
    
    # Ordenar por fecha (más recientes primero)
    all_news.sort(key=lambda x: x['date'], reverse=True)
    
    return all_news


def get_cached_news() -> Optional[List[Dict]]:
    """Obtiene noticias del cache si están vigentes"""
    if not news_cache['data'] or not news_cache['timestamp']:
        return None
    
    elapsed = (datetime.now() - news_cache['timestamp']).total_seconds()
    if elapsed > news_cache['ttl']:
        return None
    
    return news_cache['data']


def update_news_cache(force: bool = False) -> List[Dict]:
    """Actualiza el cache de noticias"""
    if not force:
        cached = get_cached_news()
        if cached:
            return cached
    
    print("🔄 Actualizando noticias...")
    news = aggregate_news(max_per_category=2)
    
    news_cache['data'] = news
    news_cache['timestamp'] = datetime.now()
    
    print(f"✅ {len(news)} noticias agregadas")
    return news


# === API ENDPOINTS ===

@app.route('/api/news', methods=['GET'])
def get_news():
    """Obtiene todas las noticias"""
    try:
        force_refresh = request.args.get('refresh', 'false').lower() == 'true'
        news = update_news_cache(force=force_refresh)
        
        return jsonify({
            'success': True,
            'count': len(news),
            'news': news,
            'cached': not force_refresh,
            'timestamp': news_cache['timestamp'].isoformat() if news_cache['timestamp'] else None
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/news/category/<category>', methods=['GET'])
def get_news_by_category(category):
    """Obtiene noticias por categoría"""
    try:
        news = update_news_cache()
        filtered = [n for n in news if n['category'] == category]
        
        return jsonify({
            'success': True,
            'category': category,
            'count': len(filtered),
            'news': filtered
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/news/search', methods=['GET'])
def search_news_endpoint():
    """Busca noticias por término"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query parameter required'
            }), 400
        
        news = update_news_cache()
        filtered = [
            n for n in news 
            if query.lower() in n['title'].lower() 
            or query.lower() in n['summary_es'].lower()
        ]
        
        return jsonify({
            'success': True,
            'query': query,
            'count': len(filtered),
            'news': filtered
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Obtiene las categorías disponibles"""
    return jsonify({
        'success': True,
        'categories': list(NEWS_CATEGORIES.keys())
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'ai_enabled': model is not None,
        'cache_size': len(news_cache['data']),
        'cache_age': (datetime.now() - news_cache['timestamp']).total_seconds() 
                     if news_cache['timestamp'] else None
    })


if __name__ == '__main__':
    print("🚀 Iniciando KR-CLI News Aggregator...")
    print(f"🤖 AI: {'Habilitada' if model else 'Deshabilitada'}")
    
    # Pre-cargar cache
    update_news_cache()
    
    # Iniciar servidor
    app.run(host='0.0.0.0', port=5001, debug=True)
