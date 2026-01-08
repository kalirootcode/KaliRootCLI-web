# KR-CLI Educational Platform - Deployment Guide

## 🚀 Deployment Strategy

### Architecture
- **Backend**: Render.com (aprovechando el servicio existente)
- **Frontend**: GitHub Pages (hosting gratuito y rápido)
- **Database**: Supabase (ya configurado)

---

## 📦 Part 1: Deploy Backend to Render

### Step 1: Preparar el Repositorio

El backend ya está listo en `/web/backend/` con:
- ✅ `combined_api.py` - API combinada (News + Education)
- ✅ `requirements-web.txt` - Dependencias (incluyendo gunicorn)
- ✅ `render.yaml` - Configuración de Render

### Step 2: Crear Servicio en Render

1. **Ve a Render Dashboard**: https://dashboard.render.com
2. **New → Web Service**
3. **Conecta tu repositorio GitHub**: `KaliRootCLI`
4. **Configuración**:
   ```
   Name: kr-cli-education-api
   Region: Oregon (US West)
   Branch: main
   Root Directory: web/backend
   Runtime: Python 3
   Build Command: pip install -r requirements-web.txt
   Start Command: gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 combined_api:app
   ```

### Step 3: Configurar Variables de Entorno

En Render, ve a **Environment** y agrega las mismas variables que ya tienes:

```env
# Supabase (ya las tienes)
SUPABASE_URL=https://cvesmbgevcyrdbbftwvy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Groq AI (ya la tienes)
GROQ_API_KEY=tu_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

# Google Gemini (para resúmenes de noticias - NUEVA)
GEMINI_API_KEY=tu_gemini_api_key_aqui

# NowPayments (ya las tienes)
NOWPAYMENTS_API_KEY=C3VZA57-3HGMGDP-NQYD18J-EB138HH
IPN_SECRET_KEY=TyFVWjsc39ER3PsQcaijmys9C/YnsTlx

# Config (ya las tienes)
DEFAULT_CREDITS_ON_REGISTER=5
LOG_LEVEL=INFO

# Puerto (Render lo maneja automáticamente)
PORT=10000
```

### Step 4: Deploy

1. Click **Create Web Service**
2. Render automáticamente:
   - Clona el repo
   - Instala dependencias
   - Inicia el servidor
3. Espera ~5 minutos
4. Tu API estará en: `https://kr-cli-education-api.onrender.com`

### Step 5: Verificar

```bash
# Health check
curl https://kr-cli-education-api.onrender.com/health

# News API
curl https://kr-cli-education-api.onrender.com/api/news

# Education API
curl https://kr-cli-education-api.onrender.com/api/education/courses
```

---

## 🌐 Part 2: Deploy Frontend to GitHub Pages

### Step 1: Actualizar Configuración de API

1. Edita `/web/js/api-config.js`
2. Reemplaza `YOUR-RENDER-SERVICE` con tu URL real:
   ```javascript
   production: {
       NEWS_API: 'https://kr-cli-education-api.onrender.com',
       EDUCATION_API: 'https://kr-cli-education-api.onrender.com'
   }
   ```

### Step 2: Agregar Script de Configuración a HTML

Agrega en TODAS las páginas HTML (antes de otros scripts):
```html
<script src="js/api-config.js"></script>
```

Páginas a actualizar:
- `dashboard.html`
- `educacion.html`
- `noticias.html`
- `herramientas.html`

### Step 3: Actualizar Llamadas a API

En los archivos JS, reemplaza URLs hardcodeadas:

**Antes:**
```javascript
const API_URL = 'http://localhost:5001/api/news';
```

**Después:**
```javascript
const API_URL = `${window.KR_API_CONFIG.NEWS_API}/api/news`;
```

### Step 4: Configurar GitHub Pages

1. **Push al repositorio**:
   ```bash
   cd /home/rk13/RK13CODE/KaliRootCLI
   git add web/
   git commit -m "Add educational platform deployment config"
   git push origin main
   ```

2. **Habilitar GitHub Pages**:
   - Ve a: Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/web`
   - Save

3. **Espera ~2 minutos**

4. **Tu sitio estará en**:
   ```
   https://kalirootcode.github.io/KaliRootCLI/
   ```

### Step 5: Configurar CORS en Render

En tu backend de Render, asegúrate que CORS permita tu dominio de GitHub Pages.

El archivo `combined_api.py` ya tiene:
```python
CORS(app)  # Permite todos los orígenes
```

Para producción, puedes restringirlo:
```python
CORS(app, origins=[
    'https://kalirootcode.github.io',
    'http://localhost:8080'  # Para desarrollo
])
```

---

## 🔧 Part 3: Optimizaciones

### Caché de Render

Render en plan gratuito "duerme" después de 15 minutos de inactividad. Para mantenerlo activo:

1. **Opción 1**: Upgrade a plan pagado ($7/mes)
2. **Opción 2**: Usar un servicio de ping (ej: UptimeRobot)
3. **Opción 3**: Aceptar el cold start (~30 segundos primera carga)

### CDN para Assets

Para máxima velocidad, considera usar un CDN:
- Cloudflare Pages (gratis)
- Vercel (gratis)
- Netlify (gratis)

---

## 📋 Checklist de Deployment

### Backend (Render)
- [ ] Crear servicio en Render
- [ ] Configurar variables de entorno
- [ ] Verificar que el servicio inicia correctamente
- [ ] Probar endpoints con curl
- [ ] Configurar CORS

### Frontend (GitHub Pages)
- [ ] Actualizar `api-config.js` con URL de Render
- [ ] Agregar `api-config.js` a todas las páginas HTML
- [ ] Actualizar llamadas a API en JS
- [ ] Push a GitHub
- [ ] Habilitar GitHub Pages
- [ ] Verificar que el sitio carga correctamente

### Testing
- [ ] Probar login/registro
- [ ] Probar carga de noticias
- [ ] Probar navegación de cursos
- [ ] Probar laboratorios
- [ ] Probar en móvil
- [ ] Verificar que el progreso se guarda

---

## 🎯 URLs Finales

Después del deployment:

- **Frontend**: `https://kalirootcode.github.io/KaliRootCLI/`
- **Backend API**: `https://kr-cli-education-api.onrender.com`
- **Dashboard**: `https://kalirootcode.github.io/KaliRootCLI/dashboard.html`
- **Educación**: `https://kalirootcode.github.io/KaliRootCLI/educacion.html`
- **Noticias**: `https://kalirootcode.github.io/KaliRootCLI/noticias.html`
- **Herramientas**: `https://kalirootcode.github.io/KaliRootCLI/herramientas.html`

---

## 💡 Tips

1. **Gemini API Key**: Consigue una gratis en https://makersuite.google.com/app/apikey
2. **Render Logs**: Usa los logs de Render para debugging
3. **GitHub Actions**: Considera automatizar el deployment con GitHub Actions
4. **Custom Domain**: Puedes usar un dominio personalizado en GitHub Pages

---

## 🆘 Troubleshooting

### Error: CORS
- Verifica que CORS esté habilitado en `combined_api.py`
- Agrega tu dominio de GitHub Pages a la lista de orígenes permitidos

### Error: API no responde
- Verifica que el servicio de Render esté activo
- Revisa los logs en Render Dashboard
- Verifica las variables de entorno

### Error: Noticias no cargan
- Verifica que `GEMINI_API_KEY` esté configurada
- Si no tienes API key, las noticias funcionarán pero sin resúmenes AI

### Frontend no actualiza
- Limpia caché del navegador (Ctrl+Shift+R)
- Verifica que GitHub Pages esté habilitado
- Espera ~2 minutos para que GitHub Pages actualice

---

**¡Listo para deployment! 🚀**
