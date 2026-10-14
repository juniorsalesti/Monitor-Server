/**
 * Generates ready-to-run agent scripts for Linux / Unix / Windows servers
 */

export function generateBashAgent(serverUrl: string): string {
  return `#!/usr/bin/env bash
# ==============================================================================
# Agente Leve de Monitoramento e Detecção de Reinicializações
# Servidor: 89.58.58.246
# ==============================================================================

SERVER_URL="${serverUrl}"
ENDPOINT="\${SERVER_URL}/api/agent/heartbeat"
INTERVAL=30

echo "[+] Iniciando Agente de Monitoramento para \${SERVER_URL}..."

get_boot_time() {
  # Obtém o timestamp exato do boot do kernel Linux
  if [ -f /proc/stat ]; then
    btime=$(awk '/btime/ {print $2}' /proc/stat)
    if [ -n "$btime" ]; then
      date -u -d "@$btime" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -r "$btime" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null
      return
    fi
  fi
  # Fallback para uptime -s
  if command -v uptime >/dev/null 2>&1; then
    uptime_s=$(uptime -s 2>/dev/null)
    if [ -n "$uptime_s" ]; then
      date -u -d "$uptime_s" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null
      return
    fi
  fi
  # Fallback genérico
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

get_uptime_seconds() {
  if [ -f /proc/uptime ]; then
    awk '{print int($1)}' /proc/uptime
  else
    echo "0"
  fi
}

get_metrics() {
  # CPU %
  cpu=$(top -bn1 2>/dev/null | awk '/Cpu\\(s\\)/ {print 100 - $8}' || echo "0")
  # Memory MB
  mem_total=$(free -m 2>/dev/null | awk '/Mem:/ {print $2}' || echo "0")
  mem_used=$(free -m 2>/dev/null | awk '/Mem:/ {print $3}' || echo "0")
  mem_pct=0
  if [ "$mem_total" -gt 0 ] 2>/dev/null; then
    mem_pct=$(awk -v u="$mem_used" -v t="$mem_total" 'BEGIN {printf "%.1f", (u/t)*100}')
  fi
  # Disk %
  disk_pct=$(df -h / 2>/dev/null | awk 'NR==2 {gsub("%",""); print $5}' || echo "0")
  
  echo "{\\"cpuPercent\\": \${cpu:-0}, \\"memoryPercent\\": \${mem_pct:-0}, \\"memoryUsedMb\\": \${mem_used:-0}, \\"memoryTotalMb\\": \${mem_total:-0}, \\"diskPercent\\": \${disk_pct:-0}}"
}

send_heartbeat() {
  BOOT_TIME=$(get_boot_time)
  UPTIME_SECS=$(get_uptime_seconds)
  HOSTNAME=$(hostname 2>/dev/null || echo "srv-89-58-58-246")
  OS_INFO=$(uname -s -r 2>/dev/null || echo "Linux")
  KERNEL=$(uname -v 2>/dev/null || echo "Generic")
  METRICS=$(get_metrics)

  PAYLOAD=$(cat <<EOF
{
  "bootTime": "\${BOOT_TIME}",
  "uptimeSeconds": \${UPTIME_SECS},
  "hostname": "\${HOSTNAME}",
  "os": "\${OS_INFO}",
  "kernel": "\${KERNEL}",
  "metrics": \${METRICS}
}
EOF
)

  echo "[*] Enviando heartbeat (Boot: \${BOOT_TIME}, Uptime: \${UPTIME_SECS}s)..."
  curl -s -X POST "\${ENDPOINT}" \\
    -H "Content-Type: application/json" \\
    -d "\${PAYLOAD}" > /dev/null 2>&1

  if [ $? -eq 0 ]; then
    echo "[✓] Heartbeat enviado com sucesso."
  else
    echo "[!] Falha ao enviar heartbeat para \${ENDPOINT}."
  fi
}

# Se chamado com argumento --once, envia apenas uma vez e sai
if [ "$1" = "--once" ]; then
  send_heartbeat
  exit 0
fi

# Loop continuo a cada 30 segundos
while true; do
  send_heartbeat
  sleep \${INTERVAL}
done
`;
}

export function generatePythonAgent(serverUrl: string): string {
  return `#!/usr/bin/env python3
# ==============================================================================
# Agente Python de Monitoramento do Servidor 89.58.58.246
# ==============================================================================
import json
import os
import platform
import subprocess
import time
import urllib.request
from datetime import datetime, timezone

SERVER_URL = "${serverUrl}"
ENDPOINT = f"{SERVER_URL}/api/agent/heartbeat"
INTERVAL = 30

def get_boot_time():
    try:
        with open('/proc/stat', 'r') as f:
            for line in f:
                if line.startswith('btime'):
                    btime = int(line.split()[1])
                    return datetime.fromtimestamp(btime, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        pass
    
    try:
        out = subprocess.check_output(['uptime', '-s'], universal_newlines=True).strip()
        dt = datetime.strptime(out, "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        pass
    
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def get_uptime_seconds():
    try:
        with open('/proc/uptime', 'r') as f:
            return int(float(f.readline().split()[0]))
    except Exception:
        return 0

def get_metrics():
    metrics = {"cpuPercent": 0, "memoryPercent": 0, "diskPercent": 0}
    try:
        # Memory
        with open('/proc/meminfo', 'r') as f:
            mem = {}
            for line in f:
                parts = line.split(':')
                if len(parts) == 2:
                    mem[parts[0].strip()] = int(parts[1].split()[0])
            total = mem.get('MemTotal', 1)
            free = mem.get('MemAvailable', mem.get('MemFree', 0))
            used = total - free
            metrics["memoryTotalMb"] = round(total / 1024)
            metrics["memoryUsedMb"] = round(used / 1024)
            metrics["memoryPercent"] = round((used / total) * 100, 1)
    except Exception:
        pass

    try:
        # Disk
        st = os.statvfs('/')
        total = st.f_blocks * st.f_frsize
        free = st.f_bavail * st.f_frsize
        used = total - free
        if total > 0:
            metrics["diskPercent"] = round((used / total) * 100, 1)
    except Exception:
        pass

    return metrics

def send_heartbeat():
    boot_time = get_boot_time()
    uptime_sec = get_uptime_seconds()
    hostname = platform.node()
    os_name = f"{platform.system()} {platform.release()}"
    kernel = platform.version()
    metrics = get_metrics()

    payload = {
        "bootTime": boot_time,
        "uptimeSeconds": uptime_sec,
        "hostname": hostname,
        "os": os_name,
        "kernel": kernel,
        "metrics": metrics
    }

    try:
        req = urllib.request.Request(
            ENDPOINT,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"[✓] Heartbeat enviado com sucesso (Boot: {boot_time}, Uptime: {uptime_sec}s)")
    except Exception as e:
        print(f"[!] Erro ao enviar heartbeat: {e}")

if __name__ == '__main__':
    print(f"[+] Iniciando Agente Python -> {ENDPOINT}")
    while True:
        send_heartbeat()
        time.sleep(INTERVAL)
`;
}

export function generateInstallScript(serverUrl: string): string {
  return `#!/usr/bin/env bash
# ==============================================================================
# Instalador Automático do Agente de Monitoramento
# Alvo: Servidor 89.58.58.246
# ==============================================================================

set -e

SERVER_URL="${serverUrl}"
AGENT_DIR="/opt/server-monitor"
AGENT_BIN="\${AGENT_DIR}/agent.sh"
SERVICE_FILE="/etc/systemd/system/server-monitor-agent.service"

echo "================================================================"
echo "    Instalação do Agente de Monitoramento de Servidor          "
echo "    Endereço do Painel: \${SERVER_URL}                         "
echo "================================================================"

# Cria diretório do agente
mkdir -p "\${AGENT_DIR}"

# Baixa script do agente
echo "[1/4] Baixando script do agente..."
curl -sSL "\${SERVER_URL}/api/agent/script.sh" -o "\${AGENT_BIN}"
chmod +x "\${AGENT_BIN}"

# Cria serviço systemd para iniciar automaticamente com o SO
echo "[2/4] Configurando inicialização automática via systemd..."
cat <<EOF > "\${SERVICE_FILE}"
[Unit]
Description=Agente de Monitoramento e Detecção de Reboot
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=\${AGENT_BIN}
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Recarrega e ativa serviço
echo "[3/4] Habilitando serviço no boot..."
systemctl daemon-reload
systemctl enable server-monitor-agent.service
systemctl restart server-monitor-agent.service

echo "[4/4] Enviando primeiro heartbeat de teste..."
"\${AGENT_BIN}" --once || true

echo "================================================================"
echo "  ✓ AGENTE INSTALADO COM SUCESSO!                              "
echo "  - O serviço iniciará automaticamente em todo boot do servidor "
echo "  - Reinicializações e métricas agora são rastreadas no painel  "
echo "  - Status do serviço: systemctl status server-monitor-agent   "
echo "================================================================"
`;
}
