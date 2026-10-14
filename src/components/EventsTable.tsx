import { useState } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, Download, Trash2, Search, Filter } from 'lucide-react';
import { MonitorEvent } from '../types.ts';
import { formatDateTime } from '../utils/formatters.ts';

interface EventsTableProps {
  events: MonitorEvent[];
  onClearHistory: () => void;
}

export function EventsTable({ events, onClearHistory }: EventsTableProps) {
  const [filterType, setFilterType] = useState<'all' | 'outage' | 'recovery' | 'reboot'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchDate = e.timestamp.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchDate;
    }
    return true;
  });

  const outagesCount = events.filter((e) => e.type === 'outage').length;
  const recoveriesCount = events.filter((e) => e.type === 'recovery').length;
  const rebootsCount = events.filter((e) => e.type === 'reboot').length;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Histórico de Eventos & Auditoria
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro persistente de quedas, restabelecimentos e reinicializações detectadas
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV / JSON */}
          <a
            href="/api/events/export?format=csv"
            download="historico_servidor.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </a>

          <a
            href="/api/events/export?format=json"
            download="historico_servidor.json"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </a>

          {/* Clear button */}
          {events.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="px-5 py-3 bg-[#0b0f17]/50 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Interactive Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filterType === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({events.length})
          </button>
          <button
            onClick={() => setFilterType('outage')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filterType === 'outage'
                ? 'bg-rose-900/40 text-rose-300 border border-rose-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Quedas ({outagesCount})
          </button>
          <button
            onClick={() => setFilterType('recovery')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filterType === 'recovery'
                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Retornos ({recoveriesCount})
          </button>
          <button
            onClick={() => setFilterType('reboot')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filterType === 'reboot'
                ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reinicializações ({rebootsCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição ou data..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>
      </div>

      {/* Events List / Table */}
      {filteredEvents.length === 0 ? (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <Filter className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Nenhum evento encontrado</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {events.length === 0
              ? 'O servidor está operando normalmente. Quedas, retornos e reinicializações aparecerão aqui automaticamente.'
              : 'Nenhum evento corresponde ao filtro selecionado.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f17] text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Status / Evento</th>
                <th className="py-3 px-4">Data & Hora</th>
                <th className="py-3 px-4">Duração</th>
                <th className="py-3 px-4">Detalhes</th>
                <th className="py-3 px-4 text-right">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {filteredEvents.map((evt) => {
                let badgeStyle = 'text-slate-300';
                let icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
                let typeLabel = 'Online';

                if (evt.type === 'outage') {
                  badgeStyle = 'text-rose-400 font-semibold';
                  icon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
                  typeLabel = 'Queda';
                } else if (evt.type === 'recovery') {
                  badgeStyle = 'text-emerald-400 font-semibold';
                  icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
                  typeLabel = 'Retorno Online';
                } else if (evt.type === 'reboot') {
                  badgeStyle = 'text-blue-400 font-semibold';
                  icon = <RotateCcw className="w-4 h-4 text-blue-400" />;
                  typeLabel = 'Reinicialização';
                }

                const sourceLabel =
                  evt.metadata?.source === 'agent'
                    ? 'Agente SO'
                    : evt.metadata?.source === 'heuristic'
                    ? 'Heurística'
                    : evt.metadata?.source === 'manual'
                    ? 'Simulação'
                    : 'Sonda TCP';

                return (
                  <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Type & Icon */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className={badgeStyle}>{typeLabel}</span>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-slate-300">
                      {formatDateTime(evt.timestamp)}
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums">
                      {evt.durationFormatted ? (
                        <span className="text-amber-300 bg-amber-950/30 border border-amber-900/40 px-2 py-0.5 rounded text-[11px]">
                          {evt.durationFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="font-medium text-white">{evt.title}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5 max-w-xl">
                        {evt.description}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        {sourceLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal to Clear History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Limpar Histórico de Eventos?</h3>
            <p className="text-xs text-slate-400">
              Esta ação removerá todos os registros salvos de quedas, retornos e reinicializações. O monitoramento continuará normalmente.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onClearHistory();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
              >
                Confirmar e Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
