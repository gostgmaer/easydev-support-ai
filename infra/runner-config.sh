#!/usr/bin/env bash
set -euo pipefail

RUNNER_DIR="/opt/actions-runner"
RUNNER_URL="https://github.com/easydev/easydev-support-ai"
RUNNER_TOKEN=${GITHUB_RUNNER_TOKEN:-""}

echo "[RUNNER] Initiating GitHub Actions Self-Hosted Runner configuration manager..."

check_status() {
  if [ -f "${RUNNER_DIR}/.runner" ]; then
    echo "[RUNNER] Active runner configuration detected in ${RUNNER_DIR}."
    if pgrep -f "Runner.Listener" > /dev/null; then
      echo "[RUNNER] Runner process is currently ONLINE and listening."
    else
      echo "[RUNNER] Runner process is OFFLINE. Attempting recovery..."
      recover_runner
    fi
  else
    echo "[RUNNER] No active configuration found. Registration required."
    register_runner
  fi
}

register_runner() {
  if [ -z "$RUNNER_TOKEN" ]; then
    echo "[RUNNER] Error: GITHUB_RUNNER_TOKEN environment variable not set. Cannot register runner."
    exit 1
  fi
  
  mkdir -p "$RUNNER_DIR"
  cd "$RUNNER_DIR"
  
  echo "[RUNNER] Downloading latest runner package..."
  curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
  tar xzf ./actions-runner-linux-x64.tar.gz
  
  echo "[RUNNER] Configuring runner client..."
  ./config.sh --url "$RUNNER_URL" --token "$RUNNER_TOKEN" --name "easydev-runner-node" --work "_work" --replace --unattended
  
  echo "[RUNNER] Installing runner as systemd system service..."
  sudo ./svc.sh install
  sudo ./svc.sh start
  echo "[RUNNER] Runner successfully registered and started."
}

recover_runner() {
  cd "$RUNNER_DIR"
  echo "[RUNNER] Attempting to restart runner service..."
  if [ -f "./svc.sh" ]; then
    sudo ./svc.sh start || sudo systemctl restart actions-runner.service
    echo "[RUNNER] Runner service start command triggered."
  else
    echo "[RUNNER] Systemd service script not found. Launching runner as background task..."
    nohup ./run.sh > runner.log 2>&1 &
  fi
}

monitor_runner() {
  echo "[RUNNER] Resource utilization monitoring:"
  cpu_idle=$(vmstat 1 2 | tail -1 | awk '{print $15}')
  cpu_used=$((100 - cpu_idle))
  mem_free=$(free -m | awk '/Mem:/ {print $4}')
  disk_avail=$(df -h / | awk 'NR==2 {print $4}')
  
  echo "  - CPU Usage: ${cpu_used}%"
  echo "  - Memory Free: ${mem_free} MB"
  echo "  - Disk Space Available: ${disk_avail}"
}

case "${1:-status}" in
  status)
    check_status
    ;;
  register)
    register_runner
    ;;
  recover)
    recover_runner
    ;;
  monitor)
    monitor_runner
    ;;
  *)
    echo "Usage: $0 {status|register|recover|monitor}"
    exit 1
    ;;
esac
