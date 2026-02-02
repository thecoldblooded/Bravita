#!/bin/bash
# Bravita VPS Deployment Script
# Run this script on your VPS to deploy the application
#
# Prerequisites:
# - Node.js 18+ installed
# - Nginx installed
# - Let's Encrypt certbot installed
# - Git installed

set -e  # Exit on error

# =============================================
# Configuration
# =============================================
DOMAIN="bravita.com.tr"
APP_DIR="/var/www/bravita"
NGINX_CONF="/etc/nginx/sites-available/bravita.conf"
REPO_URL="your-git-repo-url"  # Update this
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Bravita Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# =============================================
# Step 1: Update system packages
# =============================================
echo -e "\n${YELLOW}[1/7] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# =============================================
# Step 2: Install/Update Node.js (if needed)
# =============================================
echo -e "\n${YELLOW}[2/7] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node -v
npm -v

# =============================================
# Step 3: Clone/Pull repository
# =============================================
echo -e "\n${YELLOW}[3/7] Setting up application directory...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Updating existing installation..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
else
    echo "Creating new installation..."
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
    git checkout $BRANCH
fi

# =============================================
# Step 4: Install dependencies and build
# =============================================
echo -e "\n${YELLOW}[4/7] Installing dependencies and building...${NC}"
npm ci --production=false
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    echo -e "${RED}Build failed! dist folder not found.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# =============================================
# Step 5: Setup Nginx configuration
# =============================================
echo -e "\n${YELLOW}[5/7] Configuring Nginx...${NC}"

# Copy nginx config
sudo cp nginx.conf $NGINX_CONF

# Create symlink if not exists
if [ ! -L "/etc/nginx/sites-enabled/bravita.conf" ]; then
    sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/
fi

# Test nginx configuration
sudo nginx -t

# =============================================
# Step 6: Setup SSL with Let's Encrypt
# =============================================
echo -e "\n${YELLOW}[6/7] Setting up SSL certificate...${NC}"

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Obtaining SSL certificate..."
    sudo certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
else
    echo "SSL certificate already exists. Checking renewal..."
    sudo certbot renew --dry-run
fi

# =============================================
# Step 7: Reload Nginx
# =============================================
echo -e "\n${YELLOW}[7/7] Reloading Nginx...${NC}"
sudo systemctl reload nginx

# =============================================
# Verification
# =============================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your site should be available at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "To verify security headers, run:"
echo -e "  curl -I https://$DOMAIN"
echo ""
echo -e "Or visit:"
echo -e "  https://securityheaders.com/?q=$DOMAIN"
echo ""

# Test the site
echo -e "${YELLOW}Testing site availability...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Site is responding with HTTP 200${NC}"
else
    echo -e "${RED}✗ Site returned HTTP $HTTP_STATUS${NC}"
    echo -e "${YELLOW}Please check nginx error logs: sudo tail -f /var/log/nginx/bravita.error.log${NC}"
fi
