#!/usr/bin/env python3
"""
KR-CLI Education API
Sistema de gestión de progreso educativo y laboratorios
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime
from typing import Dict, List

app = Flask(__name__)
CORS(app)

# Estructura de cursos y laboratorios
EDUCATION_STRUCTURE = {
    'courses': [
        {
            'id': 'fundamentos',
            'title': 'Fundamentos de Ciberseguridad',
            'description': 'Conceptos básicos, terminología y metodologías',
            'icon': '🎓',
            'difficulty': 'beginner',
            'modules': [
                {
                    'id': 'intro',
                    'title': 'Introducción al Hacking Ético',
                    'labs': ['lab_intro_1', 'lab_intro_2']
                },
                {
                    'id': 'networking',
                    'title': 'Fundamentos de Redes',
                    'labs': ['lab_net_1', 'lab_net_2', 'lab_net_3']
                },
                {
                    'id': 'linux',
                    'title': 'Dominio de Linux',
                    'labs': ['lab_linux_1', 'lab_linux_2', 'lab_linux_3']
                }
            ]
        },
        {
            'id': 'reconnaissance',
            'title': 'Reconocimiento y Enumeración',
            'description': 'Técnicas de recopilación de información',
            'icon': '🔍',
            'difficulty': 'intermediate',
            'modules': [
                {
                    'id': 'passive',
                    'title': 'Reconocimiento Pasivo',
                    'labs': ['lab_osint_1', 'lab_osint_2']
                },
                {
                    'id': 'active',
                    'title': 'Reconocimiento Activo',
                    'labs': ['lab_nmap_1', 'lab_nmap_2', 'lab_enum_1']
                }
            ]
        },
        {
            'id': 'exploitation',
            'title': 'Explotación de Vulnerabilidades',
            'description': 'Técnicas de explotación y post-explotación',
            'icon': '⚔️',
            'difficulty': 'advanced',
            'modules': [
                {
                    'id': 'web',
                    'title': 'Explotación Web',
                    'labs': ['lab_sqli_1', 'lab_xss_1', 'lab_rce_1']
                },
                {
                    'id': 'system',
                    'title': 'Explotación de Sistemas',
                    'labs': ['lab_buffer_1', 'lab_priv_esc_1']
                }
            ]
        },
        {
            'id': 'post_exploitation',
            'title': 'Post-Explotación',
            'description': 'Persistencia, pivoting y exfiltración',
            'icon': '🎯',
            'difficulty': 'advanced',
            'modules': [
                {
                    'id': 'persistence',
                    'title': 'Técnicas de Persistencia',
                    'labs': ['lab_persist_1', 'lab_persist_2']
                },
                {
                    'id': 'pivoting',
                    'title': 'Pivoting y Lateral Movement',
                    'labs': ['lab_pivot_1', 'lab_lateral_1']
                }
            ]
        }
    ]
}

# Laboratorios detallados
LABS = {
    'lab_intro_1': {
        'id': 'lab_intro_1',
        'title': 'Tu Primer Escaneo con Nmap',
        'description': 'Aprende a usar Nmap para descubrir hosts y servicios',
        'difficulty': 'beginner',
        'estimated_time': '15 min',
        'objectives': [
            'Entender qué es un escaneo de puertos',
            'Usar Nmap para descubrir hosts activos',
            'Identificar servicios en puertos abiertos'
        ],
        'steps': [
            {
                'step': 1,
                'title': 'Escaneo básico de host',
                'description': 'Escanea un host para ver si está activo',
                'command': 'nmap -sn 192.168.1.1',
                'explanation': '-sn realiza un ping scan sin escanear puertos'
            },
            {
                'step': 2,
                'title': 'Escaneo de puertos comunes',
                'description': 'Escanea los 1000 puertos más comunes',
                'command': 'nmap 192.168.1.1',
                'explanation': 'Por defecto, Nmap escanea los 1000 puertos más comunes'
            },
            {
                'step': 3,
                'title': 'Detección de servicios',
                'description': 'Identifica qué servicios corren en los puertos',
                'command': 'nmap -sV 192.168.1.1',
                'explanation': '-sV detecta versiones de servicios'
            }
        ],
        'resources': [
            {'title': 'Nmap Official Guide', 'url': 'https://nmap.org/book/'},
            {'title': 'Nmap Cheat Sheet', 'url': 'https://www.stationx.net/nmap-cheat-sheet/'}
        ]
    },
    'lab_osint_1': {
        'id': 'lab_osint_1',
        'title': 'OSINT: Reconocimiento de Dominios',
        'description': 'Recopila información pública sobre un dominio objetivo',
        'difficulty': 'intermediate',
        'estimated_time': '30 min',
        'objectives': [
            'Realizar reconocimiento pasivo de un dominio',
            'Descubrir subdominios',
            'Recopilar información de DNS'
        ],
        'steps': [
            {
                'step': 1,
                'title': 'Whois Lookup',
                'description': 'Obtén información de registro del dominio',
                'command': 'whois example.com',
                'explanation': 'Whois revela información del registrante, nameservers, fechas'
            },
            {
                'step': 2,
                'title': 'Enumeración de DNS',
                'description': 'Descubre registros DNS',
                'command': 'dig example.com ANY',
                'explanation': 'Obtiene todos los registros DNS disponibles'
            },
            {
                'step': 3,
                'title': 'Búsqueda de subdominios',
                'description': 'Usa herramientas para encontrar subdominios',
                'command': 'subfinder -d example.com',
                'explanation': 'Subfinder busca subdominios en fuentes públicas'
            }
        ],
        'resources': [
            {'title': 'OSINT Framework', 'url': 'https://osintframework.com/'},
            {'title': 'Subfinder', 'url': 'https://github.com/projectdiscovery/subfinder'}
        ]
    }
}


# === API ENDPOINTS ===

@app.route('/api/education/courses', methods=['GET'])
def get_courses():
    """Obtiene todos los cursos disponibles"""
    return jsonify({
        'success': True,
        'courses': EDUCATION_STRUCTURE['courses']
    })


@app.route('/api/education/course/<course_id>', methods=['GET'])
def get_course(course_id):
    """Obtiene detalles de un curso específico"""
    course = next((c for c in EDUCATION_STRUCTURE['courses'] if c['id'] == course_id), None)
    
    if not course:
        return jsonify({
            'success': False,
            'error': 'Course not found'
        }), 404
    
    return jsonify({
        'success': True,
        'course': course
    })


@app.route('/api/education/lab/<lab_id>', methods=['GET'])
def get_lab(lab_id):
    """Obtiene detalles de un laboratorio específico"""
    lab = LABS.get(lab_id)
    
    if not lab:
        return jsonify({
            'success': False,
            'error': 'Lab not found'
        }), 404
    
    return jsonify({
        'success': True,
        'lab': lab
    })


@app.route('/api/education/stats', methods=['GET'])
def get_stats():
    """Obtiene estadísticas generales del sistema educativo"""
    total_courses = len(EDUCATION_STRUCTURE['courses'])
    total_modules = sum(len(c['modules']) for c in EDUCATION_STRUCTURE['courses'])
    total_labs = len(LABS)
    
    return jsonify({
        'success': True,
        'stats': {
            'total_courses': total_courses,
            'total_modules': total_modules,
            'total_labs': total_labs,
            'difficulties': {
                'beginner': sum(1 for c in EDUCATION_STRUCTURE['courses'] if c['difficulty'] == 'beginner'),
                'intermediate': sum(1 for c in EDUCATION_STRUCTURE['courses'] if c['difficulty'] == 'intermediate'),
                'advanced': sum(1 for c in EDUCATION_STRUCTURE['courses'] if c['difficulty'] == 'advanced')
            }
        }
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'education-api',
        'timestamp': datetime.now().isoformat()
    })


if __name__ == '__main__':
    print("🎓 Iniciando KR-CLI Education API...")
    print(f"📚 Cursos disponibles: {len(EDUCATION_STRUCTURE['courses'])}")
    print(f"🧪 Laboratorios disponibles: {len(LABS)}")
    
    app.run(host='0.0.0.0', port=5002, debug=True)
