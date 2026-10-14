import { useEffect, useState } from 'react';
import { CheckCircle2, AlertOctagon, Clock, Wifi, ShieldAlert, Cpu } from 'lucide-react';
import { formatUptimeDuration, formatRelativeTime } from '../utils/formatters.ts';
import { MonitorState } from '../types.ts';

interface StatusHeroProps {
  state: MonitorState;
  countdownSeconds: number;
}

export function StatusHero({ state, countdownSeconds }: StatusHeroProps) {
  const isOnline = state.currentStatus === 'ONLINE';
  const isChecking = state.currentStatus === 'CHECKING';

  // Live ticking counter for seconds
  const [liveUptime, setLiveUptime] = useState(() => formatUptimeDuration(state.uptimeSince));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveUptime(formatUptimeDuration(state.uptimeSince));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.uptimeSince]);

  const latency = state.lastLatencyMs;
  let latencyBadgeColor = 'text-slate-400';
  if (latency !== null) {
    if (latency < 200) latencyBadgeColor = 'text-emerald-400';
    else if (latency < 500) latencyBadgeColor = 'text-amber-400';
    else latencyBadgeColor = 'text-rose-400';
  }

  const checkInterval = state.config.checkIntervalSeconds || 10;
  const progressPercent = Math.min(100, Math.max(0, ((checkInterval - countdownSeconds) / checkInterval) * 100));

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#111827] shadow-xl p-6 md:p-8">
      {/* Background ambient gradient based on status */}
      <div
        className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-700 ${
          isOnline ? 'bg-emerald-500' : 'bg-rose-600'
        }`}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Main Status Block */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-slate-300 font-medium">IP: {state.config.targetIp}</span>
            <span aria-hidden="true">·</span>
            <span>Porta {state.config.targetPort} (TCP)</span>
            <span aria-hidden="true">·</span>
            <span>Verificação a cada {state.config.checkIntervalSeconds}s</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div
              className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
                isOnline
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : isChecking
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300 animate-pulse'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isOnline ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : isChecking ? (
                  <Wifi className="w-6 h-6 text-amber-400 animate-spin" />
                ) : (
                  <AlertOctagon className="w-6 h-6 text-rose-500" />
                )}
              </div>
              <span className="text-2xl font-extrabold tracking-tight">
                {isOnline ? 'ONLINE' : isChecking ? 'VERIFICANDO' : 'OFFLINE'}
              </span>
            </div>

            {state.agent.active && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-medium">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Agente Ativo</span>
                {state.agent.hostname && (
                  <span className="text-slate-400 font-mono">({state.agent.hostname})</span>
                )}
              </div>
            )}
          </div>

          {/* Server Location Badge */}
          {state.serverLocation && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-md">
                <span className="text-sm leading-none">{state.serverLocation.flag}</span>
                <span className="font-medium text-white">
                  {state.serverLocation.city ? `${state.serverLocation.city}, ` : ''}{state.serverLocation.country}
                </span>
                {state.serverLocation.region && (
                  <span className="text-slate-400 text-[11px]">({state.serverLocation.region})</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/50 border border-slate-800/60 px-2.5 py-1 rounded-md">
                <span className="text-slate-500">Provedor:</span>
                <span className="text-slate-300 font-medium truncate max-w-[200px]" title={state.serverLocation.isp}>
                  {state.serverLocation.isp || state.serverLocation.org}
                </span>
              </div>
              {state.serverLocation.timezone && (
                <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500">
                  {state.serverLocation.timezone}
                </span>
              )}
            </div>
          )}

          <p className="text-sm text-slate-400 max-w-xl">
            {isOnline
              ? `O servidor responde prontamente com socket TCP estabelecido na porta ${state.config.targetPort}. Nenhuma interrupção em andamento.`
              : isChecking
              ? 'Conectando ao servidor para aferir disponibilidade...'
              : `Atenção: Conexão indisponível em ${state.config.targetIp}:${state.config.targetPort}. Verifique firewall ou o estado da máquina.`}
          </p>
        </div>

        {/* Right: Real-time Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:w-auto">
          {/* Latency Box */}
          <div className="bg-[#0b0f17] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Latência</span>
              <Wifi className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold font-mono tabular-nums ${latencyBadgeColor}`}>
                {latency !== null && isOnline ? latency : '--'}
              </span>
              <span className="text-xs text-slate-500 font-mono">ms</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {latency !== null && latency < 200 ? 'Excelente' : latency !== null ? 'Estável' : 'Sem resposta'}
            </div>
          </div>

          {/* Uptime Box */}
          <div className="bg-[#0b0f17] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Tempo Online</span>
              <Clock className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-100 truncate">
              {isOnline ? liveUptime.formatted : '0s (Em queda)'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              Desde última alteração
            </div>
          </div>

          {/* Next Check Countdown Box */}
          <div className="col-span-2 sm:col-span-1 bg-[#0b0f17] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Última Aferição</span>
              <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-xs font-semibold text-slate-200">
              {formatRelativeTime(state.lastCheck)}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Próxima</span>
                <span>{countdownSeconds}s</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
