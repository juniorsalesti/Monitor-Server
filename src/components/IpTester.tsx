import { useState } from 'react';
import { Search, Globe, CheckCircle2, AlertOctagon, MapPin, Building, ArrowRight, Radio, RefreshCw } from 'lucide-react';
import { GeoLocation } from '../types.ts';

interface IpTestResult {
  success: boolean;
  latencyMs: number;
  error: string | null;
  ip: string;
  port: number;
  location: GeoLocation | null;
}

interface IpTesterProps {
  currentIp: string;
  currentPort: number;
  onSetAsTarget: (ip: string, port: number) => Promise<void>;
}

export function IpTester({ currentIp, currentPort, onSetAsTarget }: IpTesterProps) {
  const [testIp, setTestIp] = useState('');
  const [testPort, setTestPort] = useState('22');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IpTestResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const presets = [
    { label: 'Servidor 89.58.58.246 (SSH)', ip: '89.58.58.246', port: '22' },
    { label: 'Cloudflare (1.1.1.1 : 443)', ip: '1.1.1.1', port: '443' },
    { label: 'Google DNS (8.8.8.8 : 53)', ip: '8.8.8.8', port: '53' },
  ];

  const commonPorts = [
    { label: '22 SSH', port: '22' },
    { label: '80 HTTP', port: '80' },
    { label: '443 HTTPS', port: '443' },
    { label: '8080 Web', port: '8080' },
    { label: '3306 MySQL', port: '3306' },
  ];

  const handleTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = testIp.trim() || currentIp;
    const port = parseInt(testPort, 10) || 22;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/test-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: target, port, timeoutMs: 3500 }),
      });
      const data: IpTestResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        latencyMs: 0,
        error: err.message || 'Falha na requisição',
        ip: target,
        port,
        location: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAsMonitor = async () => {
    if (!result) return;
    setIsApplying(true);
    try {
      await onSetAsTarget(result.ip, result.port);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800/80 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white tracking-tight">
              Testador de Novos IPs & Diagnóstico de Rede
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Teste qualquer IP ou host, verifique se portas estão abertas, meça a latência e descubra a localização geográfica exata
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">Exemplos:</span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setTestIp(preset.ip);
                setTestPort(preset.port);
              }}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test Form */}
      <form onSubmit={handleTest} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* IP Input */}
          <div className="md:col-span-7">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Endereço IP ou Hostname
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={testIp}
                onChange={(e) => setTestIp(e.target.value)}
                placeholder={`ex: ${currentIp}`}
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Port Input */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Porta
            </label>
            <input
              type="number"
              value={testPort}
              onChange={(e) => setTestPort(e.target.value)}
              min={1}
              max={65535}
              placeholder="22"
              className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-center"
            />
          </div>

          {/* Submit Button */}
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 h-[38px] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Testando Conexão...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Testar Conexão</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Port Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-500">Portas comuns:</span>
          {commonPorts.map((cp) => (
            <button
              key={cp.port}
              type="button"
              onClick={() => setTestPort(cp.port)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                testPort === cp.port
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cp.label}
            </button>
          ))}
        </div>
      </form>

      {/* Test Results Display */}
      {result && (
        <div className="mt-5 pt-5 border-t border-slate-800">
          <div
            className={`p-4 rounded-xl border transition-all ${
              result.success
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-rose-950/20 border-rose-500/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Status & Latency */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertOctagon className="w-5 h-5 text-rose-500" />
                  )}
                  <span className="font-bold text-sm text-white">
                    {result.success ? 'Conexão Estabelecida com Sucesso' : 'Falha na Conexão'}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {result.ip}:{result.port}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                  {result.success ? (
                    <>
                      <span>Latência: <strong className="text-emerald-400 font-mono">{result.latencyMs}ms</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Socket TCP respondendo</span>
                    </>
                  ) : (
                    <span className="text-rose-400 font-mono">
                      Erro: {result.error || 'Porta fechada ou host inacessível'}
                    </span>
                  )}
                </div>
              </div>

              {/* Set as Target Action */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApplyAsMonitor}
                  disabled={isApplying || (result.ip === currentIp && result.port === currentPort)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {result.ip === currentIp && result.port === currentPort
                      ? 'Já é o Servidor Monitorado'
                      : isApplying
                      ? 'Aplicando...'
                      : 'Monitorar este IP'}
                  </span>
                </button>
              </div>
            </div>

            {/* Geolocation Section */}
            {result.location && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Location */}
                <div className="flex items-start gap-2 bg-[#0b0f17] p-2.5 rounded-lg border border-slate-800">
                  <span className="text-base leading-none mt-0.5">{result.location.flag}</span>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">
                      Localização Física
                    </span>
                    <span className="font-medium text-white block">
                      {result.location.city ? `${result.location.city}, ` : ''}{result.location.country}
                    </span>
                    {result.location.region && (
                      <span className="text-[11px] text-slate-400 block font-mono">
                        Região: {result.location.region}
                      </span>
                    )}
                  </div>
                </div>

                {/* ISP / Network */}
                <div className="flex items-start gap-2 bg-[#0b0f17] p-2.5 rounded-lg border border-slate-800">
                  <Building className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">
                      Provedor / ASN
                    </span>
                    <span className="font-medium text-white truncate block max-w-[200px]" title={result.location.isp}>
                      {result.location.isp || 'Desconhecido'}
                    </span>
                    {result.location.org && (
                      <span className="text-[11px] text-slate-400 truncate block max-w-[200px]">
                        {result.location.org}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timezone & IP */}
                <div className="flex items-start gap-2 bg-[#0b0f17] p-2.5 rounded-lg border border-slate-800">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">
                      Fuso Horário & Rota
                    </span>
                    <span className="font-mono text-white block">
                      {result.location.timezone || 'UTC'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 block">
                      IP: {result.location.query}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
