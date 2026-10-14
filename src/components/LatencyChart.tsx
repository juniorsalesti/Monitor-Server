import { useState } from 'react';
import { LatencyPoint } from '../types.ts';
import { formatTimeOnly } from '../utils/formatters.ts';

interface LatencyChartProps {
  history: LatencyPoint[];
}

export function LatencyChart({ history }: LatencyChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: LatencyPoint;
    x: number;
    y: number;
  } | null>(null);

  if (history.length === 0) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 text-center text-sm text-slate-500 py-12">
        Aguardando primeiras aferições de latência...
      </div>
    );
  }

  const validPoints = history.slice(-40); // show last 40 checks
  const maxLatency = Math.max(...validPoints.map((p) => p.latencyMs), 250);
  const chartHeight = 140;
  const chartWidth = 800;
  const paddingX = 10;
  const paddingY = 20;

  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  // Build points coordinates
  const coords = validPoints.map((p, idx) => {
    const x = paddingX + (idx / Math.max(1, validPoints.length - 1)) * innerWidth;
    const ratio = p.success ? p.latencyMs / maxLatency : 1;
    const y = paddingY + innerHeight - Math.max(0, Math.min(innerHeight, ratio * innerHeight));
    return { x, y, point: p };
  });

  const linePath = coords.reduce((acc, c, idx) => {
    return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, '');

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${chartHeight - paddingY} L ${coords[0].x} ${chartHeight - paddingY} Z`
      : '';

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Tempo de Resposta em Tempo Real (Latência TCP)
          </h2>
          <p className="text-xs text-slate-400">
            Amostras coletadas automaticamente a cada 10 segundos na porta 22
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>Sucesso (&lt;{maxLatency}ms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Falha / Timeout</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[150px] overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid guide lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            stroke="#1e293b"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingY + innerHeight / 2}
            x2={chartWidth - paddingX}
            y2={paddingY + innerHeight / 2}
            stroke="#1e293b"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#latencyGradient)" />}

          {/* Line trace */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Circles for points */}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={hoveredPoint?.point === c.point ? 5 : c.point.success ? 2.5 : 4}
              className={`transition-all duration-150 cursor-pointer ${
                c.point.success ? 'fill-emerald-400 hover:fill-emerald-300' : 'fill-rose-500'
              }`}
              onMouseEnter={() => setHoveredPoint(c)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded text-xs shadow-xl text-white font-mono whitespace-nowrap"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(hoveredPoint.y / chartHeight) * 100 - 8}%`,
            }}
          >
            <div className="font-bold text-emerald-400">
              {hoveredPoint.point.success ? `${hoveredPoint.point.latencyMs} ms` : 'Falha na conexão'}
            </div>
            <div className="text-[10px] text-slate-400">
              {formatTimeOnly(hoveredPoint.point.timestamp)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800">
        <span>{formatTimeOnly(validPoints[0]?.timestamp)}</span>
        <span>Amostras recentes ({validPoints.length} medições)</span>
        <span>{formatTimeOnly(validPoints[validPoints.length - 1]?.timestamp)}</span>
      </div>
    </div>
  );
}
