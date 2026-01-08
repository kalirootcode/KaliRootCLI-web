# KR-CLI Educational Platform

## 🎓 Sistema Educativo Profesional de Ciberseguridad

Plataforma web educativa con laboratorios interactivos, noticias en tiempo real y herramientas de pentesting.

## 🚀 Características

### 📚 Sistema Educativo
- **4 Cursos Estructurados**: Desde fundamentos hasta post-explotación
- **15+ Laboratorios Interactivos**: Paso a paso con comandos reales
- **Tracking de Progreso**: Sistema de progreso guardado en localStorage
- **Sin Censura**: Técnicas reales de hacking ético

### 📰 Agregador de Noticias
- **Búsqueda Automática**: Usa DuckDuckGo Search para encontrar noticias
- **IA Integrada**: Resúmenes y traducciones con Google Gemini
- **Categorías**: Vulnerabilidades, Exploits, Herramientas, Brechas, Eventos
- **Filtrado y Búsqueda**: Sistema de filtros en tiempo real

### 🛠️ Arsenal de Herramientas
- **14 Módulos Especializados**: Port Scanner, CVE Lookup, OSINT, Metasploit, etc.
- **Ejemplos de Uso**: Comandos reales para cada herramienta
- **Documentación**: Enlaces a recursos oficiales
- **Categorización**: Reconnaissance, Exploitation, Post-Exploitation, Forensics, Utilities

## 📁 Estructura del Proyecto

```
web/
├── backend/
│   ├── news_aggregator.py      # API de noticias con DDGS + AI
│   ├── education_api.py         # API de cursos y laboratorios
│   └── requirements-web.txt     # Dependencias Python
├── css/
│   ├── main.css                 # Estilos principales
│   ├── shared.css               # Componentes premium (glassmorphism, neon)
│   ├── dashboard.css            # Estilos del dashboard
│   ├── animations.css           # Animaciones
│   └── responsive.css           # Responsive design
├── js/
│   ├── dashboard.js             # Lógica del dashboard
│   ├── auth.js                  # Autenticación
│   └── main.js                  # Scripts principales
├── index.html                   # Landing page
├── dashboard.html               # Dashboard con progreso y noticias
├── educacion.html               # Página de educación
├── noticias.html                # Página de noticias
├── herramientas.html            # Página de herramientas
└── start_backend.sh             # Script de inicio de servidores
```

## 🔧 Instalación y Uso

### 1. Instalar Dependencias del Backend

```bash
cd web/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-web.txt
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en el directorio `web/backend/`:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

### 3. Iniciar Servidores Backend

Opción A - Script automático:
```bash
cd web
./start_backend.sh
```

Opción B - Manual:
```bash
# Terminal 1 - News Aggregator
cd web/backend
python3 news_aggregator.py

# Terminal 2 - Education API
cd web/backend
python3 education_api.py
```

### 4. Iniciar Servidor Web

```bash
cd web
python3 -m http.server 8000
```

### 5. Abrir en Navegador

Visita: `http://localhost:8000`

## 🌐 Endpoints de API

### News Aggregator (Puerto 5001)

- `GET /api/news` - Obtener todas las noticias
- `GET /api/news?refresh=true` - Forzar actualización
- `GET /api/news/category/<category>` - Filtrar por categoría
- `GET /api/news/search?q=<query>` - Buscar noticias
- `GET /api/categories` - Listar categorías
- `GET /api/health` - Health check

### Education API (Puerto 5002)

- `GET /api/education/courses` - Listar todos los cursos
- `GET /api/education/course/<course_id>` - Detalles de curso
- `GET /api/education/lab/<lab_id>` - Detalles de laboratorio
- `GET /api/education/stats` - Estadísticas generales
- `GET /api/health` - Health check

## 🎨 Diseño Premium

### Características Visuales

- **Glassmorphism**: Efectos de vidrio con blur
- **Neon Effects**: Sombras y bordes neón (cyan, purple, green)
- **Gradientes Tecnológicos**: Combinaciones de colores vibrantes
- **Animaciones Suaves**: Transiciones y hover effects
- **Tema Oscuro**: Optimizado para uso prolongado

### Paleta de Colores

- **Primary**: `#00ff88` (Verde neón)
- **Secondary**: `#00d4ff` (Cyan)
- **Accent**: `#a855f7` (Púrpura)
- **Background**: `#0a0e27` (Azul oscuro)

## 📱 Responsive Design

- **Desktop**: Grid completo con todas las características
- **Tablet**: Grid adaptativo de 2 columnas
- **Mobile**: Stack vertical optimizado

## 🔒 Seguridad

- **Sin Censura**: Contenido educativo real sin restricciones
- **Ético**: Advertencias y disclaimers apropiados
- **Privacidad**: Progreso guardado localmente (localStorage)

## 🚀 Próximas Mejoras

- [ ] Sistema de certificaciones
- [ ] Modo offline para laboratorios
- [ ] Integración con Supabase para progreso en la nube
- [ ] Más laboratorios y cursos
- [ ] Sistema de gamificación
- [ ] Foro de comunidad

## 📄 Licencia

© 2026 KaliRoot Code - Uso educativo

## 🤝 Contribuciones

Este es un proyecto educativo. Para contribuir o reportar issues, contacta a kalirootcode@proton.me

---

**Hecho con 💚 para hackers, por hackers**
