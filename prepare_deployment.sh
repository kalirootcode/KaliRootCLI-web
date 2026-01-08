#!/bin/bash
# Deployment Preparation Script
# Updates all HTML files to use api-config.js

echo "🚀 Preparing KR-CLI Educational Platform for Deployment"
echo ""

cd "$(dirname "$0")"

# Function to add api-config.js to HTML files
add_api_config() {
    local file=$1
    echo "📝 Updating $file..."
    
    # Check if api-config.js is already included
    if grep -q "api-config.js" "$file"; then
        echo "   ✅ Already configured"
    else
        # Add before config.js or supabase-client.js
        if grep -q "config.js" "$file"; then
            sed -i 's|<script src="js/config.js">|<script src="js/api-config.js"></script>\n    <script src="js/config.js">|' "$file"
            echo "   ✅ Added api-config.js"
        elif grep -q "supabase-client.js" "$file"; then
            sed -i 's|<script src="js/supabase-client.js">|<script src="js/api-config.js"></script>\n    <script src="js/supabase-client.js">|' "$file"
            echo "   ✅ Added api-config.js"
        else
            echo "   ⚠️  Could not find insertion point"
        fi
    fi
}

# Update HTML files
echo "📄 Updating HTML files..."
add_api_config "dashboard.html"
add_api_config "educacion.html"
add_api_config "noticias.html"
add_api_config "herramientas.html"

echo ""
echo "✅ Preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update web/js/api-config.js with your Render URL"
echo "2. Commit and push to GitHub:"
echo "   git add ."
echo "   git commit -m 'Add educational platform with deployment config'"
echo "   git push origin main"
echo ""
echo "3. Deploy backend to Render (see DEPLOYMENT.md)"
echo "4. Enable GitHub Pages (see DEPLOYMENT.md)"
echo ""
