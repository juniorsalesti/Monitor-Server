import net from 'net';
import fs from 'fs';
import path from 'path';

export interface MonitorConfig {
  targetIp: string;
  targetPort: number;
  checkIntervalSeconds: number;
  timeoutMs: number;
  failureThreshold: number;
}

export interface MonitorEvent {
  id: string;
  type: 'outage' | 'recovery' | 'reboot' | 'manual_check';
  timestamp: string;
  title: string;
  description: string;
  durationMs?: number;
  durationFormatted?: string;
  metadata?: {
    ip?: string;
    port?: number;
    latencyMs?: number;
    bootTime?: string;
    previousBootTime?: string;
    hostname?: string;
    source?: 'agent' | 'tcp_probe' | 'heuristic' | 'manual';
    [key: string]: any;
  };
}

export interface LatencyPoint {
  timestamp: string;
  latencyMs: number;
  success: boolean;
}

export interface AgentData {
  active: boolean;
  lastHeartbeat: string | null;
  bootTime: string | null;
  uptimeSeconds: number | null;
  hostname: string | null;
  os: string | null;
  kernel: string | null;
  metrics?: {
    cpuPercent?: number;
    memoryPercent?: number;
    memoryUsedMb?: number;
    memoryTotalMb?: number;
    diskPercent?: number;
  };
}

export interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isp: string;
  org: string;
  timezone: string;
  flag: string;
  query: string;
}

export interface MonitorState {
  config: MonitorConfig;
  currentStatus: 'ONLINE' | 'OFFLINE' | 'CHECKING';
  lastCheck: string | null;
  lastLatencyMs: number | null;
  uptimeSince: string;
  outageStartTime: string | null;
  consecutiveFailures: number;
  totalChecks: number;
  successfulChecks: number;
  events: MonitorEvent[];
  latencyHistory: LatencyPoint[];
  agent: AgentData;
  serverLocation: GeoLocation | null;
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel
  ? path.resolve('/tmp', 'monitor_data')
  : path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'monitor_state.json');

const DEFAULT_CONFIG: MonitorConfig = {
  targetIp: '89.58.58.246',
  targetPort: 22,
  checkIntervalSeconds: 10,
  timeoutMs: 3000,
  failureThreshold: 2,
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h ${remainingMinutes}m`;
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export async function fetchIpLocation(ip: string): Promise<GeoLocation | null> {
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,timezone,isp,org,query`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'success') return null;
    return {
      country: data.country || 'Desconhecido',
      countryCode: data.countryCode || '',
      region: data.regionName || '',
      city: data.city || '',
      isp: data.isp || '',
      org: data.org || '',
      timezone: data.timezone || '',
      flag: getFlagEmoji(data.countryCode || ''),
      query: data.query || ip,
    };
  } catch (err) {
    return null;
  }
}

export class MonitorService {
  private state: MonitorState;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isProbing = false;

  constructor() {
    this.state = this.loadState();
    this.refreshLocation();
    this.startLoop();
  }

  public async refreshLocation() {
    try {
      const loc = await fetchIpLocation(this.state.config.targetIp);
      if (loc) {
        this.state.serverLocation = loc;
        this.saveState();
      }
    } catch {
      // Ignore
    }
  }

  private loadState(): MonitorState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
          currentStatus: parsed.currentStatus || 'CHECKING',
          lastCheck: parsed.lastCheck || null,
          lastLatencyMs: parsed.lastLatencyMs || null,
          uptimeSince: parsed.uptimeSince || new Date().toISOString(),
          outageStartTime: parsed.outageStartTime || null,
          consecutiveFailures: parsed.consecutiveFailures || 0,
          totalChecks: parsed.totalChecks || 0,
          successfulChecks: parsed.successfulChecks || 0,
          events: Array.isArray(parsed.events) ? parsed.events : [],
          latencyHistory: Array.isArray(parsed.latencyHistory) ? parsed.latencyHistory : [],
          agent: parsed.agent || {
            active: false,
            lastHeartbeat: null,
            bootTime: null,
            uptimeSeconds: null,
            hostname: null,
            os: null,
            kernel: null,
          },
          serverLocation: parsed.serverLocation || null,
        };
      }
    } catch (err) {
      console.error('Error loading state from disk, using default:', err);
    }

    return {
      config: { ...DEFAULT_CONFIG },
      currentStatus: 'CHECKING',
      lastCheck: null,
      lastLatencyMs: null,
      uptimeSince: new Date().toISOString(),
      outageStartTime: null,
      consecutiveFailures: 0,
      totalChecks: 0,
      successfulChecks: 0,
      events: [],
      latencyHistory: [],
      agent: {
        active: false,
        lastHeartbeat: null,
        bootTime: null,
        uptimeSeconds: null,
        hostname: null,
        os: null,
        kernel: null,
      },
      serverLocation: null,
    };
  }

  private saveState() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save monitor state to disk:', err);
    }
  }

  public getState(): MonitorState {
    return this.state;
  }

  public async getFreshState(): Promise<MonitorState> {
    const lastCheckTime = this.state.lastCheck ? new Date(this.state.lastCheck).getTime() : 0;
    const intervalMs = Math.max(5, this.state.config.checkIntervalSeconds) * 1000;
    if (Date.now() - lastCheckTime >= intervalMs || !this.state.lastCheck) {
      await this.runCheck();
    }
    return this.state;
  }

  public updateConfig(newConfig: Partial<MonitorConfig>) {
    const ipChanged = newConfig.targetIp && newConfig.targetIp !== this.state.config.targetIp;
    this.state.config = { ...this.state.config, ...newConfig };
    if (ipChanged) {
      this.refreshLocation();
    }
    this.saveState();
    // Restart interval if interval changed
    this.startLoop();
    return this.state.config;
  }

  public async testArbitraryIp(
    ip: string,
    port = 22,
    timeout = 3000
  ): Promise<{
    success: boolean;
    latencyMs: number;
    error: string | null;
    ip: string;
    port: number;
    location: GeoLocation | null;
  }> {
    const [probeResult, location] = await Promise.all([
      this.probeTarget(ip, port, timeout),
      fetchIpLocation(ip),
    ]);

    return {
      ...probeResult,
      ip,
      port,
      location,
    };
  }

  public async probeTarget(ip = this.state.config.targetIp, port = this.state.config.targetPort, timeout = this.state.config.timeoutMs): Promise<{ success: boolean; latencyMs: number; error: string | null }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const startTime = Date.now();
      let resolved = false;

      socket.setTimeout(timeout);

      socket.connect(port, ip, () => {
        if (resolved) return;
        resolved = true;
        const latencyMs = Date.now() - startTime;
        socket.destroy();
        resolve({ success: true, latencyMs, error: null });
      });

      socket.on('error', (err) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve({ success: false, latencyMs: 0, error: err.message || 'Falha de conexão' });
      });

      socket.on('timeout', () => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve({ success: false, latencyMs: 0, error: `Tempo limite esgotado (${timeout}ms)` });
      });
    });
  }

  public async runCheck(): Promise<MonitorState> {
    if (this.isProbing) return this.state;
    this.isProbing = true;

    try {
      const { targetIp, targetPort, timeoutMs, failureThreshold } = this.state.config;
      const result = await this.probeTarget(targetIp, targetPort, timeoutMs);
      const now = new Date();
      const nowIso = now.toISOString();

      this.state.totalChecks++;
      this.state.lastCheck = nowIso;

      // Update latency history (keep last 60 points)
      this.state.latencyHistory.push({
        timestamp: nowIso,
        latencyMs: result.success ? result.latencyMs : 0,
        success: result.success,
      });
      if (this.state.latencyHistory.length > 60) {
        this.state.latencyHistory.shift();
      }

      if (result.success) {
        this.state.successfulChecks++;
        this.state.lastLatencyMs = result.latencyMs;

        // If previously OFFLINE, handle recovery
        if (this.state.currentStatus === 'OFFLINE') {
          const outageStart = this.state.outageStartTime ? new Date(this.state.outageStartTime).getTime() : now.getTime();
          const durationMs = Math.max(1000, now.getTime() - outageStart);
          const durationFormatted = formatDuration(durationMs);

          // Check if this brief outage looks like a reboot (e.g. 15s to 300s) and agent hasn't explicitly reported
          const looksLikeReboot = durationMs >= 15000 && durationMs <= 300000;

          const recoveryEvent: MonitorEvent = {
            id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'recovery',
            timestamp: nowIso,
            title: 'Servidor Voltou a Ficar Online',
            description: `Conexão restabelecida em ${result.latencyMs}ms. Tempo total de queda: ${durationFormatted}.`,
            durationMs,
            durationFormatted,
            metadata: {
              ip: targetIp,
              port: targetPort,
              latencyMs: result.latencyMs,
              source: 'tcp_probe',
            },
          };
          this.state.events.unshift(recoveryEvent);

          // If brief downtime, also log potential reboot heuristic note
          if (looksLikeReboot && !this.state.agent.active) {
            this.state.events.unshift({
              id: `evt-reb-${Date.now()}`,
              type: 'reboot',
              timestamp: nowIso,
              title: 'Provável Reinicialização Detectada',
              description: `O servidor esteve inacessível por ${durationFormatted} e retornou online, padrão correspondente a ciclo de reinicialização de SO. (Instale o agente para validação a nível de kernel).`,
              durationMs,
              durationFormatted,
              metadata: {
                ip: targetIp,
                port: targetPort,
                source: 'heuristic',
              },
            });
          }

          this.state.currentStatus = 'ONLINE';
          this.state.outageStartTime = null;
          this.state.uptimeSince = nowIso;
        } else {
          this.state.currentStatus = 'ONLINE';
        }

        this.state.consecutiveFailures = 0;
      } else {
        // Failed check
        this.state.consecutiveFailures++;

        // Only transition to OFFLINE if failures reach threshold (anti-false-positive debounce)
        if (this.state.consecutiveFailures >= failureThreshold && this.state.currentStatus !== 'OFFLINE') {
          this.state.currentStatus = 'OFFLINE';
          this.state.outageStartTime = nowIso;

          const outageEvent: MonitorEvent = {
            id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'outage',
            timestamp: nowIso,
            title: 'Queda do Servidor Detectada',
            description: `Não foi possível conectar em ${targetIp}:${targetPort}. Erro: ${result.error}. (Tentativas consecutivas: ${this.state.consecutiveFailures})`,
            metadata: {
              ip: targetIp,
              port: targetPort,
              source: 'tcp_probe',
            },
          };
          this.state.events.unshift(outageEvent);
        }
      }

      // Keep only last 200 events
      if (this.state.events.length > 200) {
        this.state.events = this.state.events.slice(0, 200);
      }

      this.saveState();
    } catch (err) {
      console.error('Error during monitoring check:', err);
    } finally {
      this.isProbing = false;
    }

    return this.state;
  }

  public handleAgentHeartbeat(payload: {
    bootTime: string;
    uptimeSeconds?: number;
    hostname?: string;
    os?: string;
    kernel?: string;
    metrics?: {
      cpuPercent?: number;
      memoryPercent?: number;
      memoryUsedMb?: number;
      memoryTotalMb?: number;
      diskPercent?: number;
    };
  }): { success: boolean; rebootDetected: boolean; message: string } {
    const nowIso = new Date().toISOString();
    const prevBootTime = this.state.agent.bootTime;
    let rebootDetected = false;

    // Normalize boot time
    const newBootTime = payload.bootTime;

    if (prevBootTime && prevBootTime !== newBootTime) {
      rebootDetected = true;
      const rebootEvent: MonitorEvent = {
        id: `evt-reboot-${Date.now()}`,
        type: 'reboot',
        timestamp: nowIso,
        title: 'Reinicialização do Servidor Confirmada',
        description: `O agente no servidor confirmou nova inicialização do sistema operacional. Horário de boot: ${new Date(newBootTime).toLocaleString('pt-BR')}.`,
        metadata: {
          ip: this.state.config.targetIp,
          bootTime: newBootTime,
          previousBootTime: prevBootTime,
          hostname: payload.hostname || this.state.agent.hostname || 'Desconhecido',
          source: 'agent',
        },
      };
      this.state.events.unshift(rebootEvent);
      this.state.uptimeSince = newBootTime;
    } else if (!prevBootTime && payload.bootTime) {
      // First boot report
      this.state.uptimeSince = payload.bootTime;
    }

    this.state.agent = {
      active: true,
      lastHeartbeat: nowIso,
      bootTime: newBootTime,
      uptimeSeconds: payload.uptimeSeconds || null,
      hostname: payload.hostname || this.state.agent.hostname,
      os: payload.os || this.state.agent.os,
      kernel: payload.kernel || this.state.agent.kernel,
      metrics: payload.metrics || this.state.agent.metrics,
    };

    // If server was marked offline, agent contact confirms it is online
    if (this.state.currentStatus === 'OFFLINE') {
      const outageStart = this.state.outageStartTime ? new Date(this.state.outageStartTime).getTime() : Date.now();
      const durationMs = Math.max(1000, Date.now() - outageStart);
      const durationFormatted = formatDuration(durationMs);

      this.state.events.unshift({
        id: `evt-${Date.now()}`,
        type: 'recovery',
        timestamp: nowIso,
        title: 'Servidor Voltou a Ficar Online (Via Agente)',
        description: `Heartbeat recebido do agente. Tempo total de queda: ${durationFormatted}.`,
        durationMs,
        durationFormatted,
        metadata: {
          ip: this.state.config.targetIp,
          bootTime: newBootTime,
          source: 'agent',
        },
      });
      this.state.currentStatus = 'ONLINE';
      this.state.outageStartTime = null;
    }

    this.saveState();

    return {
      success: true,
      rebootDetected,
      message: rebootDetected ? 'Reinicialização registrada com sucesso' : 'Heartbeat processado com sucesso',
    };
  }

  public simulateReboot(): MonitorEvent {
    const nowIso = new Date().toISOString();
    const newBootTime = nowIso;
    const prevBoot = this.state.agent.bootTime || this.state.uptimeSince;

    const event: MonitorEvent = {
      id: `evt-reboot-sim-${Date.now()}`,
      type: 'reboot',
      timestamp: nowIso,
      title: 'Reinicialização do Servidor (Simulada para Teste)',
      description: `Evento de teste: Nova inicialização do sistema registrada. Boot registrado às ${new Date().toLocaleTimeString('pt-BR')}.`,
      metadata: {
        ip: this.state.config.targetIp,
        bootTime: newBootTime,
        previousBootTime: prevBoot,
        hostname: this.state.agent.hostname || 'srv-89-58-58-246',
        source: 'manual',
      },
    };

    this.state.events.unshift(event);
    this.state.uptimeSince = nowIso;
    this.state.agent.bootTime = newBootTime;
    this.state.agent.lastHeartbeat = nowIso;
    this.state.agent.active = true;
    this.saveState();

    return event;
  }

  public clearEvents() {
    this.state.events = [];
    this.saveState();
  }

  private startLoop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    const intervalMs = Math.max(5, this.state.config.checkIntervalSeconds) * 1000;
    // Immediate initial check
    this.runCheck();

    this.intervalTimer = setInterval(() => {
      this.runCheck();
    }, intervalMs);
  }
}

export const monitorService = new MonitorService();
