import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Header } from './components/Header.tsx';
import { StatusHero } from './components/StatusHero.tsx';
import { MetricsGrid } from './components/MetricsGrid.tsx';
import { LatencyChart } from './components/LatencyChart.tsx';
import { EventsTable } from './components/EventsTable.tsx';
import { AgentModal } from './components/AgentModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { IpTester } from './components/IpTester.tsx';
import { MonitorState, MonitorConfig } from './types.ts';
import { soundAlerts } from './utils/audio.ts';

const DEFAULT_STATE: MonitorState = {
  config: {
    targetIp: '89.58.58.246',
    targetPort: 22,
    checkIntervalSeconds: 10,
    timeoutMs: 3000,
    failureThreshold: 2,
  },
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

export default function App() {
  const [state, setState] = useState<MonitorState>(DEFAULT_STATE);
  const [isChecking, setIsChecking] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Notifications & Sound states (stored in localStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('monitor_notifications') === 'true';
    }
    return false;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('monitor_sound') !== 'false';
    }
    return true;
  });

  const [backendError, setBackendError] = useState<string | null>(null);

  // Countdown timer for next check (10s down to 0s)
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const prevStatusRef = useRef<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const prevEventsLengthRef = useRef<number>(0);

  // Fetch status from backend
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) {
        setBackendError(`HTTP ${res.status}`);
        return;
      }
      const data: MonitorState = await res.json();
      setState(data);
      setBackendError(null);

      // Status change detection for notifications & sound alerts
      const prevStatus = prevStatusRef.current;
      const newStatus = data.currentStatus;

      if (prevStatus !== 'CHECKING' && prevStatus !== newStatus) {
        if (newStatus === 'OFFLINE') {
          if (soundEnabled) soundAlerts.playOutageAlert();
          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('ALERTA: Servidor Offline!', {
              body: `O servidor ${data.config.targetIp}:${data.config.targetPort} parou de responder.`,
              icon: '/favicon.ico',
            });
          }
        } else if (newStatus === 'ONLINE' && prevStatus === 'OFFLINE') {
          if (soundEnabled) soundAlerts.playRecoveryAlert();
          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Servidor Voltou Online!', {
              body: `A conexão com ${data.config.targetIp}:${data.config.targetPort} foi restabelecida com sucesso.`,
              icon: '/favicon.ico',
            });
          }
        }
      }

      // Check if a new reboot event occurred
      if (prevEventsLengthRef.current > 0 && data.events.length > prevEventsLengthRef.current) {
        const latestEvent = data.events[0];
        if (latestEvent && latestEvent.type === 'reboot') {
          if (soundEnabled) soundAlerts.playRebootAlert();
          if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Reinicialização Detectada', {
              body: `O servidor ${data.config.targetIp} reiniciou o sistema operacional.`,
              icon: '/favicon.ico',
            });
          }
        }
      }

      prevStatusRef.current = newStatus;
      prevEventsLengthRef.current = data.events.length;
    } catch (err: any) {
      setBackendError(err.message || 'Falha de conexão com a API');
      console.error('Failed to fetch monitor status:', err);
    }
  }, [soundEnabled, notificationsEnabled]);

  // Initial load and periodic polling (every 2.5s)
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Countdown timer synced with checkIntervalSeconds
  useEffect(() => {
    const checkInterval = state.config.checkIntervalSeconds || 10;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev <= 1 ? checkInterval : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.config.checkIntervalSeconds]);

  // Manual immediate check
  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/check-now', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.state) {
          setState(json.state);
          setCountdownSeconds(state.config.checkIntervalSeconds || 10);
        }
      }
    } catch (err) {
      console.error('Error during manual check:', err);
    } finally {
      setIsChecking(false);
    }
  };

  // Toggle notifications
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('monitor_notifications', 'true');
          new Notification('Notificações Ativadas', {
            body: `Você receberá alertas sempre que o status de ${state.config.targetIp} mudar.`,
          });
        } else {
          alert('Permissão de notificações não concedida no navegador.');
        }
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('monitor_notifications', 'false');
    }
  };

  // Toggle sound
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('monitor_sound', String(nextVal));
    if (nextVal) {
      soundAlerts.playRecoveryAlert();
    }
  };

  // Save config
  const handleSaveConfig = async (newConfig: MonitorConfig) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) {
      await fetchStatus();
    }
  };

  // Clear events history
  const handleClearHistory = async () => {
    const res = await fetch('/api/events/clear', { method: 'POST' });
    if (res.ok) {
      await fetchStatus();
    }
  };

  // Simulate reboot test
  const handleSimulateReboot = async () => {
    const res = await fetch('/api/agent/simulate-reboot', { method: 'POST' });
    if (res.ok) {
      await fetchStatus();
    }
  };

  // Switch monitored target from IP tester
  const handleSetAsTarget = async (newIp: string, newPort: number) => {
    await handleSaveConfig({
      ...state.config,
      targetIp: newIp,
      targetPort: newPort,
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        status={state.currentStatus}
        isChecking={isChecking}
        onCheckNow={handleCheckNow}
        onOpenAgent={() => setIsAgentModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        targetIp={state.config.targetIp}
        flag={state.serverLocation?.flag}
      />

      {backendError && (
        <div className="bg-amber-950/60 border-b border-amber-800/80 px-4 py-2 text-center text-xs text-amber-200 flex items-center justify-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Sincronizando com o serviço de monitoramento ({backendError}). Tentando reconectar...</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Status Hero Banner */}
        <StatusHero state={state} countdownSeconds={countdownSeconds} />

        {/* Primary Metrics Grid */}
        <MetricsGrid state={state} onOpenAgent={() => setIsAgentModalOpen(true)} />

        {/* IP Testing & Network Diagnostic Tool */}
        <IpTester
          currentIp={state.config.targetIp}
          currentPort={state.config.targetPort}
          onSetAsTarget={handleSetAsTarget}
        />

        {/* Latency History Chart */}
        <LatencyChart history={state.latencyHistory} />

        {/* Event History & Audit Table */}
        <EventsTable events={state.events} onClearHistory={handleClearHistory} />
      </main>

      {/* Quiet, Clean Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0b0f17] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Servidor Alvo: <strong className="text-slate-400 font-mono">89.58.58.246:22</strong></span>
            <span aria-hidden="true">·</span>
            <span>Verificação Contínua em Segundo Plano (10s)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAgentModalOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Comandos do Agente
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Parâmetros de Rede
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        agent={state.agent}
        onSimulateReboot={handleSimulateReboot}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={state.config}
        onSaveConfig={handleSaveConfig}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
}
