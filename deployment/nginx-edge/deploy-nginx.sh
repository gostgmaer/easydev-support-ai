#!/usr/bin/env bash
# --- Zero-Downtime Deployment Script for Nginx Edge Platform ---
set -euo pipefail

CONTAINER_NAME="support-ai-nginx"
CONFIG_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DEST_DIR="/etc/nginx"
CERTS_DIR="/etc/nginx/certs"

echo "[DEPLOY-EDGE] Starting zero-downtime deployment for Nginx Edge Platform..."

# 1. Syntactic Verification of source configuration using a temporary container
echo "[DEPLOY-EDGE] Validating configuration syntax..."
if command -v docker &> /dev/null; then
    docker run --rm \
        -v "${CONFIG_SRC_DIR}/nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "${CONFIG_SRC_DIR}/conf.d:/etc/nginx/conf.d:ro" \
        -v "${CERTS_DIR}:/etc/nginx/certs:ro" \
        nginx:1.25-alpine nginx -t
    echo "  - [OK] Configuration is syntactically correct."
else
    echo "  - [WARNING] Docker not available on this node. Skipping syntax validation."
fi

# 2. Deploy configs
echo "[DEPLOY-EDGE] Copying configurations to destination directory: ${CONFIG_DEST_DIR}"
if [ -d "${CONFIG_DEST_DIR}" ]; then
    BACKUP_TIME=$(date +%Y%m%d_%H%M%S)
    tar -czf "/tmp/nginx_config_backup_${BACKUP_TIME}.tar.gz" -C / etc/nginx 2>/dev/null || true
    
    cp "${CONFIG_SRC_DIR}/nginx.conf" "${CONFIG_DEST_DIR}/nginx.conf"
    cp -r "${CONFIG_SRC_DIR}/conf.d/"* "${CONFIG_DEST_DIR}/conf.d/"
fi

# 3. Reload Nginx configuration without dropping connections (Zero-Downtime)
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[DEPLOY-EDGE] Container '${CONTAINER_NAME}' is running. Executing hot reload..."
    if docker exec "${CONTAINER_NAME}" nginx -t && docker exec "${CONTAINER_NAME}" nginx -s reload; then
        echo "[DEPLOY-EDGE] Nginx hot reload completed successfully."
    else
        echo "[DEPLOY-EDGE] [CRITICAL] Hot reload failed. Rolling back configuration..."
        if [ -f "/tmp/nginx_config_backup_${BACKUP_TIME}.tar.gz" ]; then
            tar -xzf "/tmp/nginx_config_backup_${BACKUP_TIME}.tar.gz" -C /
            docker exec "${CONTAINER_NAME}" nginx -s reload
            echo "[DEPLOY-EDGE] Rollback completed."
        fi
        exit 1
    fi
else
    echo "[DEPLOY-EDGE] Container '${CONTAINER_NAME}' is not running. Bootstrapping Nginx service..."
    if [ -f "${CONFIG_SRC_DIR}/../../docker-compose.production.yml" ]; then
        docker compose -f "${CONFIG_SRC_DIR}/../../docker-compose.production.yml" up -d nginx
    fi
fi

echo "[DEPLOY-EDGE] Deployment finished successfully."
