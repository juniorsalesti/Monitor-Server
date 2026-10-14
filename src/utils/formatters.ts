/**
 * Format date in PT-BR style
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--';
  }
}

export function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--';
  }
}

export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'Nunca';
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 3) return 'agora mesmo';
    if (diff < 60) return `há ${diff}s`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `há ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days}d`;
  } catch {
    return '--';
  }
}

export function formatUptimeDuration(sinceIso?: string | null): { days: number; hours: number; minutes: number; seconds: number; formatted: string } {
  if (!sinceIso) return { days: 0, hours: 0, minutes: 0, seconds: 0, formatted: '0s' };
  try {
    const start = new Date(sinceIso).getTime();
    if (isNaN(start)) return { days: 0, hours: 0, minutes: 0, seconds: 0, formatted: '0s' };

    const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    let formatted = '';
    if (days > 0) formatted += `${days}d `;
    if (hours > 0 || days > 0) formatted += `${hours}h `;
    formatted += `${minutes}m ${seconds}s`;

    return { days, hours, minutes, seconds, formatted };
  } catch {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, formatted: '0s' };
  }
}

export function formatDurationMs(ms?: number | null): string {
  if (ms == null || isNaN(ms)) return '--';
  const totalSecs = Math.max(1, Math.round(ms / 1000));
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const remainingSecs = totalSecs % 60;
  if (mins < 60) return `${mins}m ${remainingSecs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m ${remainingSecs}s`;
}
