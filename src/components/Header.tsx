import { Activity, RefreshCw, Server, Settings, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  status: 'ONLINE' | 'OFFLINE' | 'CHECKING';
  isChecking: boolean;
  onCheckNow: () => void;
  onOpenAgent: () => void;
  onOpenSettings: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  targetIp: string;
  flag?: string;
}

export function Header({
  status,
  isChecking,
  onCheckNow,
  onOpenAgent,
  onOpenSettings,
  notificationsEnabled,
  onToggleNotifications,
  soundEnabled,
  onToggleSound,
  targetIp,
  flag,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#0b0f17]/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white whitespace-nowrap">
                ServerMonitor
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {flag && <span>{flag}</span>}
                <span>{targetIp}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation & Quick Toggles */}
        <div className="hidden md:flex items-center gap-3 text-sm text-slate-400">
          <button
            onClick={onToggleNotifications}
            title={notificationsEnabled ? "Notificações ativadas" : "Ativar notificações no navegador"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              notificationsEnabled
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60"
            }`}
          >
            {notificationsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            <span>Alertas</span>
          </button>

          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Alerta sonoro ligado" : "Alerta sonoro mudo"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              soundEnabled
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Som</span>
          </button>

          <button
            onClick={onOpenAgent}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Agente do Servidor</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurações</span>
          </button>
        </div>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2">
          {/* Mobile Buttons */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={onOpenAgent}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              title="Agente"
            >
              <Activity className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              title="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onCheckNow}
            disabled={isChecking}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isChecking ? 'Verificando...' : 'Verificar Agora'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
