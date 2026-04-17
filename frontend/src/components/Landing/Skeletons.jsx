import React from 'react';

/** Bloco de skeleton animado para estado de carregamento */
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-800/60 ${className}`}
    />
  );
}

/** Skeleton de KPI card */
export function SkeletonKPI() {
  return (
    <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/5 space-y-3">
      <SkeletonBlock className="h-3 w-1/2" />
      <SkeletonBlock className="h-7 w-2/3" />
      <SkeletonBlock className="h-3 w-1/3" />
    </div>
  );
}

/** Skeleton de gráfico/painel */
export function SkeletonChart({ className = 'h-48' }) {
  return (
    <div className={`p-6 bg-slate-900/60 rounded-2xl border border-white/5 ${className} flex items-end gap-2`}>
      {[45, 60, 50, 70, 55, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
        <SkeletonBlock key={i} className={`flex-1`} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
