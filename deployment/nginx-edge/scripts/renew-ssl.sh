#!/usr/bin/env bash
# --- Let's Encrypt Certificate Renewal & Init Script ---
set -euo pipefail

CERT_DIR="/etc/nginx/certs"
WEBROOT_DIR="/var/www/letsencrypt"
DOMAINS=("-d" "api.easydev.in" "-d" "admin.easydev.in" "-d" "widget.easydev.in" "-d" "ws.easydev.in")
EMAIL="security@easydev.in"

echo "[SSL-RENEW] Checking SSL credentials setup..."

# 1. Generate DH parameters if they don't exist
if [ ! -f "${CERT_DIR}/dhparam.pem" ]; then
    echo "[SSL-RENEW] DH parameters missing. Generating 2048-bit dhparam.pem..."
    mkdir -p "${CERT_DIR}"
    openssl dhparam -out "${CERT_DIR}/dhparam.pem" 2048
    echo "[SSL-RENEW] dhparam.pem generated successfully."
fi

# 2. Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "[SSL-RENEW] Certbot not found. Running self-signed certificate fallback for configuration validation..."
    if [ ! -f "${CERT_DIR}/live.crt" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${CERT_DIR}/live.key" \
            -out "${CERT_DIR}/live.crt" \
            -subj "/CN=easydev.in"
        cp "${CERT_DIR}/live.crt" "${CERT_DIR}/chain.pem"
        echo "[SSL-RENEW] Self-signed certificates generated for testing."
    fi
    exit 0
fi

# 3. Renew certificate request
echo "[SSL-RENEW] Executing Certbot certificate renewal check..."
certbot certonly --webroot \
    -w "${WEBROOT_DIR}" \
    "${DOMAINS[@]}" \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --keep-until-expiring

# 4. Update symlinks to point to Let's Encrypt paths
LE_DIR="/etc/letsencrypt/live/api.easydev.in"
if [ -d "${LE_DIR}" ]; then
    echo "[SSL-RENEW] Updating certificate files..."
    ln -sf "${LE_DIR}/fullchain.pem" "${CERT_DIR}/live.crt"
    ln -sf "${LE_DIR}/privkey.pem" "${CERT_DIR}/live.key"
    ln -sf "${LE_DIR}/chain.pem" "${CERT_DIR}/chain.pem"
fi

# 5. Hot reload Nginx config to load new certificates
echo "[SSL-RENEW] Reloading Nginx daemon..."
if command -v nginx &> /dev/null; then
    nginx -t
    nginx -s reload
    echo "[SSL-RENEW] Nginx configuration reloaded successfully."
else
    echo "[SSL-RENEW] Nginx binary not found. Skipping daemon reload."
fi
