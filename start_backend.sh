#!/bin/bash
# KR-CLI Educational Platform - Backend Startup Script

echo "🚀 Iniciando servidores backend de KR-CLI Educational Platform..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no está instalado. Por favor instala Python 3."
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Check if requirements are installed
echo "📦 Verificando dependencias..."
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "📦 Instalando dependencias..."
pip install -q -r requirements-web.txt

echo ""
echo "✅ Dependencias instaladas"
echo ""

# Start news aggregator in background
echo "📰 Iniciando News Aggregator (puerto 5001)..."
python3 news_aggregator.py > /dev/null 2>&1 &
NEWS_PID=$!
echo "   PID: $NEWS_PID"

# Wait a bit
sleep 2

# Start education API in background
echo "🎓 Iniciando Education API (puerto 5002)..."
python3 education_api.py > /dev/null 2>&1 &
EDU_PID=$!
echo "   PID: $EDU_PID"

echo ""
echo "✅ Servidores backend iniciados correctamente"
echo ""
echo "📋 Información de servicios:"
echo "   - News Aggregator: http://localhost:5001"
echo "   - Education API: http://localhost:5002"
echo ""
echo "📝 Para detener los servidores:"
echo "   kill $NEWS_PID $EDU_PID"
echo ""
echo "💡 Ahora puedes abrir la aplicación web en tu navegador"
echo "   Recomendado: python3 -m http.server 8000 (en el directorio web)"
echo ""

# Save PIDs to file for easy cleanup
echo "$NEWS_PID" > .news_pid
echo "$EDU_PID" > .edu_pid

# Keep script running
echo "Presiona Ctrl+C para detener todos los servicios..."
wait
