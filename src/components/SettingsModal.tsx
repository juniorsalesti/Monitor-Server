import { useState } from 'react';
import { X, Save, Sliders, Bell, Volume2, Shield, RotateCcw } from 'lucide-react';
import { MonitorConfig } from '../types.ts';
import { soundAlerts } from '../utils/audio.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MonitorConfig;
  onSaveConfig: (newConfig: MonitorConfig) => Promise<void>;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  notificationsEnabled,
  onToggleNotifications,
  soundEnabled,
  onToggleSound,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<MonitorConfig>({ ...config });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveConfig(formData);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setFormData({
      targetIp: '89.58.58.246',
      targetPort: 22,
      checkIntervalSeconds: 10,
      timeoutMs: 3000,
      failureThreshold: 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Configurações de Monitoramento
            </h2>
            <p className="text-xs text-slate-400">
              Ajuste parâmetros de rede, intervalos e preferências de notificação
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target IP */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Endereço IP do Servidor
            </label>
            <input
              type="text"
              value={formData.targetIp}
              onChange={(e) => setFormData({ ...formData, targetIp: e.target.value })}
              required
              className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              placeholder="89.58.58.246"
            />
          </div>

          {/* Port and Interval Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Porta de Checagem (TCP)
              </label>
              <input
                type="number"
                value={formData.targetPort}
                onChange={(e) => setFormData({ ...formData, targetPort: parseInt(e.target.value, 10) || 22 })}
                required
                min={1}
                max={65535}
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Padrão: 22 (SSH). Ou 80, 443, etc.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Intervalo de Checagem (s)
              </label>
              <input
                type="number"
                value={formData.checkIntervalSeconds}
                onChange={(e) => setFormData({ ...formData, checkIntervalSeconds: parseInt(e.target.value, 10) || 10 })}
                required
                min={5}
                max={300}
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Requisito: 10 segundos
              </span>
            </div>
          </div>

          {/* Timeout and Debounce */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Timeout de Conexão (ms)
              </label>
              <input
                type="number"
                value={formData.timeoutMs}
                onChange={(e) => setFormData({ ...formData, timeoutMs: parseInt(e.target.value, 10) || 3000 })}
                required
                min={500}
                max={15000}
                step={500}
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Tempo máximo de espera
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Filtro Anti-Falso Positivo
              </label>
              <input
                type="number"
                value={formData.failureThreshold}
                onChange={(e) => setFormData({ ...formData, failureThreshold: parseInt(e.target.value, 10) || 2 })}
                required
                min={1}
                max={5}
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Falhas seguidas para registrar queda
              </span>
            </div>
          </div>

          {/* Notification & Audio Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">
              Alertas & Notificações
            </span>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Bell className={`w-4 h-4 ${notificationsEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <span className="text-xs font-medium text-white block">
                    Notificações do Navegador
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Exibe alerta nativo na área de trabalho quando o status mudar
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleNotifications}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Volume2 className={`w-4 h-4 ${soundEnabled ? 'text-blue-400' : 'text-slate-500'}`} />
                <div>
                  <span className="text-xs font-medium text-white block">
                    Alerta Sonoro (Web Audio)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Emite aviso sonoro em quedas e recuperações
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => soundAlerts.playOutageAlert()}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Testar Som
                </button>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    soundEnabled ? 'bg-blue-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrões</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveSuccess ? 'Salvo!' : isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
