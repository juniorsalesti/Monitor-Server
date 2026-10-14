import { useState } from 'react';
import { X, Copy, Check, Terminal, Cpu, HardDrive, Server, Play, ShieldCheck, AlertCircle } from 'lucide-react';
import { AgentData } from '../types.ts';
import { formatDateTime, formatRelativeTime } from '../utils/formatters.ts';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentData;
  onSimulateReboot: () => void;
}

export function AgentModal({ isOpen, onClose, agent, onSimulateReboot }: AgentModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bash' | 'python' | 'cron'>('bash');
  const [isSimulating, setIsSimulating] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://seu-painel.com';

  const bashOneLiner = `curl -sSL ${currentUrl}/api/agent/install.sh | sudo bash`;
  const pythonCommand = `curl -sSL ${currentUrl}/api/agent/script.py -o /opt/agent.py && python3 /opt/agent.py`;
  const cronJobLine = `* * * * * curl -s -X POST ${currentUrl}/api/agent/heartbeat -H "Content-Type: application/json" -d "{\\"bootTime\\":\\"$(uptime -s)\\",\\"hostname\\":\\"$(hostname)\\"}" >/dev/null 2>&1`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    await onSimulateReboot();
    setTimeout(() => setIsSimulating(false), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Agente do Servidor & Detecção de Reinicializações
            </h2>
            <p className="text-xs text-slate-400">
              Rastreamento 100% preciso do horário de boot do kernel no IP <strong className="text-slate-300">89.58.58.246</strong>
            </p>
          </div>
        </div>

        {/* Agent Live Status Card */}
        <div
          className={`p-4 rounded-xl border mb-6 transition-all ${
            agent.active
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  agent.active ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {agent.active ? 'Agente Conectado & Operante' : 'Aguardando Conexão do Agente'}
              </span>
            </div>
            {agent.lastHeartbeat && (
              <span className="text-[11px] text-slate-400 font-mono">
                Último sinal: {formatRelativeTime(agent.lastHeartbeat)}
              </span>
            )}
          </div>

          {agent.active ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Hostname</span>
                <span className="font-mono font-medium text-white truncate block">
                  {agent.hostname || 'srv-89-58-58-246'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Sistema</span>
                <span className="font-mono font-medium text-white truncate block">
                  {agent.os || 'Linux'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Último Boot</span>
                <span className="font-mono font-medium text-emerald-400 truncate block">
                  {formatDateTime(agent.bootTime)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Uptime SO</span>
                <span className="font-mono font-medium text-white truncate block">
                  {agent.uptimeSeconds ? `${Math.floor(agent.uptimeSeconds / 60)} min` : '--'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                O servidor já é monitorado automaticamente via TCP socket (porta 22). Para registrar reinicializações com exatidão no kernel e ver métricas de hardware, execute o comando abaixo no terminal do servidor.
              </span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 mb-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('bash')}
            className={`flex-1 py-1.5 rounded text-center transition-colors ${
              activeTab === 'bash' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Instalador Automático (Systemd)
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`flex-1 py-1.5 rounded text-center transition-colors ${
              activeTab === 'python' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Script Python 3
          </button>
          <button
            onClick={() => setActiveTab('cron')}
            className={`flex-1 py-1.5 rounded text-center transition-colors ${
              activeTab === 'cron' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cron Job Linux
          </button>
        </div>

        {/* Command Box */}
        <div className="space-y-4">
          {activeTab === 'bash' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Execute no terminal do servidor via SSH (<code className="text-slate-300">ssh root@89.58.58.246</code>). O script instala um serviço systemd que inicia automaticamente no boot:
              </p>
              <div className="relative bg-[#0b0f17] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-emerald-400 flex items-center justify-between gap-3 overflow-x-auto">
                <span className="select-all break-all">{bashOneLiner}</span>
                <button
                  onClick={() => handleCopy(bashOneLiner, 'bash')}
                  className="shrink-0 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copiar comando"
                >
                  {copiedType === 'bash' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Agente independente em Python 3 utilizando apenas a biblioteca padrão (sem necessidade de pip):
              </p>
              <div className="relative bg-[#0b0f17] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-blue-400 flex items-center justify-between gap-3 overflow-x-auto">
                <span className="select-all break-all">{pythonCommand}</span>
                <button
                  onClick={() => handleCopy(pythonCommand, 'python')}
                  className="shrink-0 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copiar comando"
                >
                  {copiedType === 'python' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cron' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Adicione ao <code className="text-slate-300">crontab -e</code> para enviar o horário de boot a cada minuto:
              </p>
              <div className="relative bg-[#0b0f17] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-amber-400 flex items-center justify-between gap-3 overflow-x-auto">
                <span className="select-all break-all">{cronJobLine}</span>
                <button
                  onClick={() => handleCopy(cronJobLine, 'cron')}
                  className="shrink-0 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Copiar linha cron"
                >
                  {copiedType === 'cron' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Simulation / Testing Feature */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            <span className="font-medium text-slate-300 block">Deseja testar sem reiniciar o servidor real?</span>
            <span>Simula o evento de boot do SO para validar o painel e os alertas sonoros.</span>
          </div>

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/50 rounded-xl transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Simulando...' : 'Testar Reinicialização'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
