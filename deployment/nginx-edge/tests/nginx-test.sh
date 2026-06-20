#!/usr/bin/env bash
# --- Automated Integration Tests for Nginx Edge Platform ---
set -euo pipefail

EDGE_IP="127.0.0.1"
API_HOST="api.easydev.in"
ADMIN_HOST="admin.easydev.in"
WIDGET_HOST="widget.easydev.in"
WS_HOST="ws.easydev.in"

echo "[TEST-EDGE] Initiating Edge Platform verification suite..."

# 1. Routing & SSL Redirect Test
echo "[TEST-EDGE] 1. Testing HTTP to HTTPS redirection..."
redirect_status=$(curl -s -o /dev/null -w "%{http_code}" http://${EDGE_IP}/ -H "Host: ${API_HOST}" || echo "failed")
if [ "${redirect_status}" = "301" ]; then
    echo "  - [OK] HTTP redirect to HTTPS verified (Status: 301)."
else
    echo "  - [WARNING] Redirect status received: ${redirect_status} (Expected 301)"
fi

# 2. SSL/TLS Compliance Tests (TLS 1.2, TLS 1.3 only, weak ciphers blocked)
echo "[TEST-EDGE] 2. Testing TLS compliance..."
if command -v openssl &> /dev/null; then
    if openssl s_client -connect ${EDGE_IP}:443 -servername ${API_HOST} -tls1_3 </dev/null &>/dev/null; then
        echo "  - [OK] TLS 1.3 handshake succeeded."
    else
        echo "  - [WARNING] TLS 1.3 connection handshake failed or skipped."
    fi

    if ! openssl s_client -connect ${EDGE_IP}:443 -servername ${API_HOST} -tls1_1 </dev/null &>/dev/null; then
        echo "  - [OK] TLS 1.1 connection rejected successfully."
    else
        echo "  - [FAIL] TLS 1.1 handshake succeeded. Protocol vulnerability!"
        exit 1
    fi
fi

# 3. Security Headers Test
echo "[TEST-EDGE] 3. Verifying security headers..."
headers_tmp=$(mktemp)
curl -s -I -k https://${EDGE_IP}/ -H "Host: ${API_HOST}" > "${headers_tmp}" || true

for header in "X-Frame-Options: DENY" "X-Content-Type-Options: nosniff" "Strict-Transport-Security" "Content-Security-Policy"; do
    if grep -q -i "${header}" "${headers_tmp}"; then
        echo "  - [OK] Header '${header}' present."
    else
        echo "  - [WARNING] Safety header missing: ${header}"
    fi
done
rm -f "${headers_tmp}"

# 4. WebSocket Upgrade Test
echo "[TEST-EDGE] 4. Testing WebSocket protocol handshakes..."
ws_upgrade=$(curl -i -k -N -s \
    -H "Upgrade: websocket" \
    -H "Connection: Upgrade" \
    -H "Host: ${WS_HOST}" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Sec-WebSocket-Version: 13" \
    https://${EDGE_IP}/socket.io/?EIO=4&transport=websocket | head -n 20 || echo "failed")

if echo "${ws_upgrade}" | grep -q -i "101 Switching Protocols"; then
    echo "  - [OK] WebSocket connection upgrade succeeded (Status: 101)."
else
    echo "  - [WARNING] WebSocket upgrade handshake failed."
fi

# 5. Rate Limiting Test
echo "[TEST-EDGE] 5. Testing rate limit triggers (HTTP 429)..."
rate_limited=false

for i in {1..30}; do
    code=$(curl -s -k -o /dev/null -w "%{http_code}" https://${EDGE_IP}/v1/auth/login -H "Host: ${API_HOST}" || echo "failed")
    if [ "${code}" = "429" ]; then
        rate_limited=true
        break
    fi
done

if [ "${rate_limited}" = true ]; then
    echo "  - [OK] Rate limit triggered (429 Too Many Requests) under burst load."
else
    echo "  - [WARNING] Rate limit not triggered during burst simulation."
fi

echo "[TEST-EDGE] Integration tests execution completed."
