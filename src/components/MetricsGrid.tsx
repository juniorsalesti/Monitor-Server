import { CheckSquare, RotateCcw, AlertTriangle, Cpu, TrendingUp } from 'lucide-react';
import { MonitorState } from '../types.ts';
import { formatDateTime } from '../utils/formatters.ts';

interface MetricsGridProps {
  state: MonitorState;
  onOpenAgent: () => void;
}

export function MetricsGrid({ state, onOpenAgent }: MetricsGridProps) {
  // Calculate uptime percentage
  const total = state.totalChecks;
  const successful = state.successfulChecks;
  const uptimeRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '100.0';

  // Outages and reboots count
  const outagesCount = state.events.filter((e) => e.type === 'outage').length;
  const rebootsCount = state.events.filter((e) => e.type === 'reboot').length;

  // Average latency from history
  const validLatencies = state.latencyHistory
    .filter((p) => p.success && p.latencyMs > 0)
    .map((p) => p.latencyMs);

  const avgLatency =
    validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : state.lastLatencyMs || 0;

  const minLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : avgLatency;
  const maxLatency = validLatencies.length > 0 ? Math.max(...validLatencies) : avgLatency;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Uptime & Availability */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">Disponibilidade Geral</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">{uptimeRate}%</span>
            <span className="text-xs text-slate-500">taxa de sucesso</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {successful} de {total} checagens bem-sucedidas
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Ciclo: 10s</span>
          <span className="font-mono text-emerald-400">TCP Ping</span>
        </div>
      </div>

      {/* Metric 2: Average Latency */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">Latência Média</span>
          <CheckSquare className="w-4 h-4 text-blue-400" />
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {avgLatency > 0 ? avgLatency : '--'}
            </span>
            <span className="text-xs text-slate-500 font-mono">ms</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Mín: <strong className="text-slate-300 font-mono">{minLatency}ms</strong></span>
            <span>·</span>
            <span>Máx: <strong className="text-slate-300 font-mono">{maxLatency}ms</strong></span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Amostragem</span>
          <span>Últimos {validLatencies.length} testes</span>
        </div>
      </div>

      {/* Metric 3: Outages Detected */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">Quedas Registradas</span>
          <AlertTriangle className={`w-4 h-4 ${outagesCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono tabular-nums ${outagesCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {outagesCount}
            </span>
            <span className="text-xs text-slate-500">incidentes</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {outagesCount === 0 ? 'Nenhuma queda detectada' : 'Histórico de interrupções'}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Filtro de falso-positivo</span>
          <span>{state.config.failureThreshold} falhas consec.</span>
        </div>
      </div>

      {/* Metric 4: Reboots & Kernel Boot time */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">Reinicializações (Reboots)</span>
          <RotateCcw className={`w-4 h-4 ${rebootsCount > 0 ? 'text-blue-400' : 'text-slate-500'}`} />
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {rebootsCount}
            </span>
            <span className="text-xs text-slate-500">detectadas</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 truncate">
            {state.agent.bootTime ? (
              <span>Boot: {formatDateTime(state.agent.bootTime)}</span>
            ) : (
              <span>Agente não configurado</span>
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          {state.agent.active ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Agente Conectado
            </span>
          ) : (
            <button
              onClick={onOpenAgent}
              className="text-amber-400 hover:text-amber-300 transition-colors underline cursor-pointer"
            >
              Configurar Agente
            </button>
          )}
          <span className="text-slate-500">
            {state.agent.active ? state.agent.hostname || 'Linux' : 'Requer agente'}
          </span>
        </div>
      </div>
    </div>
  );
}
