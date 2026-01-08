# Deployment Quick Reference

## 🎯 Resumen Rápido

### Backend en Render
```bash
# En Render Dashboard:
1. New Web Service
2. Connect GitHub repo: KaliRootCLI
3. Root Directory: web/backend
4. Build: pip install -r requirements-web.txt
5. Start: gunicorn --bind 0.0.0.0:$PORT --workers 2 combined_api:app
6. Add Environment Variables (las mismas que ya tienes + GEMINI_API_KEY)
```

### Frontend en GitHub Pages
```bash
# 1. Actualizar URL de API
nano web/js/api-config.js
# Cambiar YOUR-RENDER-SERVICE por tu URL real

# 2. Preparar deployment
cd web
./prepare_deployment.sh

# 3. Push a GitHub
git add .
git commit -m "Deploy educational platform"
git push origin main

# 4. Habilitar GitHub Pages
# Settings → Pages → Source: main → Folder: /web
```

## 🔑 Variables de Entorno para Render

Copia las que ya tienes + agrega:
```env
GEMINI_API_KEY=tu_api_key_de_gemini
```

Obtén Gemini API key gratis: https://makersuite.google.com/app/apikey

## 📍 URLs Finales

- Frontend: `https://kalirootcode.github.io/KaliRootCLI/`
- Backend: `https://tu-servicio.onrender.com`
- API Health: `https://tu-servicio.onrender.com/health`

## 🆘 Problemas Comunes

**API no responde**: Verifica que Render esté activo (plan gratuito duerme después de 15 min)
**CORS error**: Ya está configurado en combined_api.py
**Noticias sin resúmenes**: Falta GEMINI_API_KEY en Render

Ver DEPLOYMENT.md para guía completa.
