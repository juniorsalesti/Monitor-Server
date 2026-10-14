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
