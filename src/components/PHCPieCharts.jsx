import React, { useEffect, useState } from 'react';
import { PieChart, RefreshCw } from 'lucide-react';

const API = '/api';

const SLICE_COLORS = [
  '#3B9FFF', '#EF4444', '#22C55E', '#F97316', '#A78BFA',
  '#FBBF24', '#EC4899', '#14B8A6', '#8B5CF6', '#FB923C',
  '#06B6D4', '#84CC16', '#F43F5E', '#60A5FA', '#D97706',
];

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildSlices(items, key) {
  const total = items.reduce((s, d) => s + (d[key] || 0), 0);
  let angle = 0;
  return items
    .filter(d => (d[key] || 0) > 0)
    .map((d, i) => {
      const sweep = total > 0 ? ((d[key] || 0) / total) * 360 : 0;
      const slice = { ...d, start: angle, end: angle + sweep, sweep, pct: total > 0 ? (d[key] || 0) / total : 0, color: SLICE_COLORS[i % SLICE_COLORS.length] };
      angle += sweep;
      return slice;
    });
}

function DonutChart({ slices, total, centerLabel }) {
  const [hovered, setHovered] = useState(null);
  const S = 180, cx = 90, cy = 90, OR = 78, IR = 48;

  const hSlice = hovered !== null ? slices[hovered] : null;

  return (
    <div className="flex items-center gap-4">
      {/* SVG donut */}
      <div className="flex-shrink-0">
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
          {slices.map((s, i) => {
            const isH = hovered === i;
            const r = isH ? OR + 6 : OR;
            if (s.sweep < 0.2) return null;
            const p1 = polarToXY(cx, cy, r,  s.start);
            const p2 = polarToXY(cx, cy, r,  s.end);
            const q1 = polarToXY(cx, cy, IR, s.end);
            const q2 = polarToXY(cx, cy, IR, s.start);
            const la = s.sweep > 180 ? 1 : 0;
            const d = [
              `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
              `A ${r} ${r} 0 ${la} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
              `L ${q1.x.toFixed(2)} ${q1.y.toFixed(2)}`,
              `A ${IR} ${IR} 0 ${la} 0 ${q2.x.toFixed(2)} ${q2.y.toFixed(2)}`,
              'Z',
            ].join(' ');
            return (
              <path
                key={i}
                d={d}
                fill={s.color}
                opacity={hovered === null ? 0.85 : isH ? 1 : 0.45}
                stroke="#0B1628"
                strokeWidth={1.5}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          {/* Center text */}
          <text
            x={cx} y={cy - 6}
            textAnchor="middle"
            style={{ fill: 'var(--ccmc-text)', fontSize: 19, fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}
          >
            {hSlice ? hSlice[hSlice._key] : total}
          </text>
          <text
            x={cx} y={cy + 10}
            textAnchor="middle"
            style={{ fill: 'var(--ccmc-text-hint)', fontSize: 8.5, fontWeight: 600 }}
          >
            {hSlice
              ? (hSlice.phc_display?.length > 11 ? hSlice.phc_display.substring(0, 11) + '…' : hSlice.phc_display)
              : centerLabel}
          </text>
          {hSlice && (
            <text
              x={cx} y={cy + 23}
              textAnchor="middle"
              style={{ fill: hSlice.color, fontSize: 9, fontWeight: 700 }}
            >
              {Math.round(hSlice.pct * 100)}%
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {slices.slice(0, 10).map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 py-0.5 px-2 rounded-lg"
            style={{ background: hovered === i ? `${s.color}14` : 'transparent', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] font-medium truncate flex-1" style={{ color: 'var(--ccmc-text-sec)' }}>
              {s.phc_display}
            </span>
            <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: s.color }}>
              {s[s._key]}
            </span>
            <span className="text-[9px] tabular-nums flex-shrink-0 w-7 text-right" style={{ color: 'var(--ccmc-text-hint)' }}>
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
        {slices.length > 10 && (
          <div className="text-[9px] px-2 pt-1" style={{ color: 'var(--ccmc-text-hint)' }}>
            + {slices.length - 10} more PHCs
          </div>
        )}
      </div>
    </div>
  );
}

export default function PHCPieCharts({ user }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.full_access) return;
    setLoading(true);
    fetch(`${API}/phc-analytics?role=${user.role}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.full_access) return null;

  const enriched = data.map(d => ({ ...d, high_risk: (d.critical || 0) + (d.very_high || 0) + (d.high || 0) }));

  const totalSlices    = buildSlices(enriched, 'total').map(s => ({ ...s, _key: 'total' }));
  const riskSlices     = buildSlices(enriched.filter(d => d.high_risk > 0), 'high_risk').map(s => ({ ...s, _key: 'high_risk' }));

  const totalAll       = enriched.reduce((s, d) => s + d.total, 0);
  const totalHighRisk  = enriched.reduce((s, d) => s + d.high_risk, 0);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--ccmc-border)' }}>
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4" style={{ color: '#3B9FFF' }} />
          <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
            PHC Distribution
          </h2>
          <span className="chip ml-1"
            style={{ background: 'rgba(59,159,255,0.1)', color: '#3B9FFF', border: '1px solid rgba(59,159,255,0.2)', fontSize: 11 }}>
            {data.length} PHCs
          </span>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
          Hover slices to inspect · CHO &amp; DMCHO view
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--ccmc-text-hint)' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x"
          style={{ '--tw-divide-opacity': 1, borderColor: 'var(--ccmc-border)' }}>

          {/* Left: Overall distribution */}
          <div className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <span style={{ color: '#3B9FFF' }}>Overall PHC Distribution</span>
              <span className="font-normal normal-case tracking-normal text-[10px]"
                style={{ color: 'var(--ccmc-text-hint)' }}>
                {totalAll.toLocaleString()} total mothers
              </span>
            </div>
            <DonutChart slices={totalSlices} total={totalAll} centerLabel="Total" />
          </div>

          {/* Right: High-risk distribution */}
          <div className="p-6">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <span style={{ color: '#EF4444' }}>High-Risk Mothers by PHC</span>
              <span className="font-normal normal-case tracking-normal text-[10px]"
                style={{ color: 'var(--ccmc-text-hint)' }}>
                Critical + Very High + High
              </span>
            </div>
            {riskSlices.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[12px]"
                style={{ color: 'var(--ccmc-text-hint)' }}>
                No high-risk records
              </div>
            ) : (
              <DonutChart slices={riskSlices} total={totalHighRisk} centerLabel="High Risk" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
