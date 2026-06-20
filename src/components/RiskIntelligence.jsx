import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../ThemeContext';
import { Activity, ChevronDown, ChevronUp, X, Users, ArrowLeft } from 'lucide-react';

const API = '/api';

const TIER_COLORS = {
  Critical:   { main: '#DC2626', light: '#FEE2E2', badge: '#FCA5A5', dark: '#EF4444' },
  'Very High':{ main: '#EA580C', light: '#FFF0E6', badge: '#FDBA74', dark: '#F97316' },
  High:       { main: '#B45309', light: '#FFFBEB', badge: '#FDE68A', dark: '#EAB308' },
  Moderate:   { main: '#1D4ED8', light: '#EFF6FF', badge: '#93C5FD', dark: '#3B82F6' },
  Low:        { main: '#059669', light: '#F0FDF4', badge: '#86EFAC', dark: '#22C55E' },
};

const TIERS = ['Critical', 'Very High', 'High', 'Moderate', 'Low'];

// Polar-to-Cartesian for pie slices
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArc(cx, cy, r, startDeg, endDeg) {
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.99;
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

/* ── Horizontal bar chart ─────────────────────────────────────────────────── */
function BarChart({ factors, onSelect, selected, bright }) {
  const top = factors.slice(0, 20);
  const max = top[0]?.total || 1;

  return (
    <div className="space-y-1.5">
      {top.map((f, i) => {
        const pct   = Math.round((f.total / max) * 100);
        const isSel = selected === f.factor;
        const color = isSel ? '#2563EB' : bright ? '#0F766E' : '#3B9FFF';
        const bg    = isSel
          ? (bright ? '#EFF6FF' : 'rgba(37,99,235,0.12)')
          : 'transparent';

        return (
          <div
            key={f.factor}
            onClick={() => onSelect(isSel ? null : f.factor)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all"
            style={{
              background: bg,
              border: isSel ? `1px solid ${bright ? '#BFDBFE' : 'rgba(37,99,235,0.3)'}` : '1px solid transparent',
            }}
            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = bright ? '#F8FAFC' : 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = bg; }}
          >
            {/* Rank */}
            <span className="text-[10px] font-bold w-5 text-right flex-shrink-0"
              style={{ color: isSel ? color : 'var(--ccmc-text-hint)' }}>
              {i + 1}
            </span>

            {/* Label */}
            <span className="text-[11px] font-semibold w-36 flex-shrink-0 truncate"
              style={{ color: isSel ? color : 'var(--ccmc-text)' }}>
              {f.factor}
            </span>

            {/* Bar track */}
            <div className="flex-1 relative h-4 rounded-full overflow-hidden"
              style={{ background: bright ? '#E2E8F0' : 'rgba(255,255,255,0.07)' }}>
              {/* Tier segments inside the bar */}
              {(() => {
                let offset = 0;
                return TIERS.map(tier => {
                  const cnt  = f.tier_counts?.[tier] || 0;
                  const segW = (cnt / f.total) * pct;
                  const seg  = (
                    <div key={tier}
                      className="absolute top-0 h-full rounded-full transition-all duration-500"
                      style={{
                        left:    `${offset}%`,
                        width:   `${segW}%`,
                        background: bright ? TIER_COLORS[tier].main : TIER_COLORS[tier].dark,
                        opacity: isSel ? 1 : 0.75,
                      }} />
                  );
                  offset += segW;
                  return seg;
                });
              })()}
            </div>

            {/* Count */}
            <span className="text-[11px] font-bold w-12 text-right flex-shrink-0"
              style={{ color: isSel ? color : (bright ? '#334155' : 'var(--ccmc-text)') }}>
              {f.total.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut pie chart ──────────────────────────────────────────────────────── */
function PieChart({ factors, onSelect, selected, bright }) {
  const [hovered, setHovered] = useState(null);
  const top15 = factors.slice(0, 15);
  const total  = top15.reduce((s, f) => s + f.total, 0);

  const PIE_COLORS = bright
    ? ['#2563EB','#DC2626','#059669','#D97706','#7C3AED','#0891B2','#B45309','#BE185D',
       '#4338CA','#0F766E','#C2410C','#15803D','#1D4ED8','#B91C1C','#6D28D9']
    : ['#3B9FFF','#EF4444','#22C55E','#F59E0B','#A78BFA','#22D3EE','#FCD34D','#F472B6',
       '#818CF8','#34D399','#FB923C','#4ADE80','#60A5FA','#FCA5A5','#C084FC'];

  let angle = 0;
  const slices = top15.map((f, i) => {
    const sweep = (f.total / total) * 360;
    const slice = { ...f, startAngle: angle, endAngle: angle + sweep, color: PIE_COLORS[i % PIE_COLORS.length] };
    angle += sweep;
    return slice;
  });

  const active = hovered ?? (selected ? slices.find(s => s.factor === selected) : null);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" width="200" height="200" style={{ overflow: 'visible' }}>
        {slices.map((s, i) => {
          const isActive = (hovered?.factor ?? selected) === s.factor;
          const r = isActive ? 88 : 82;
          return (
            <path
              key={s.factor}
              d={buildArc(100, 100, r, s.startAngle, s.endAngle)}
              fill={s.color}
              opacity={isActive ? 1 : (hovered || selected) ? 0.45 : 0.85}
              stroke="var(--ccmc-panel)"
              strokeWidth={1.5}
              style={{ cursor: 'pointer', transition: 'all 0.18s' }}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(selected === s.factor ? null : s.factor)}
            />
          );
        })}

        {/* Center label */}
        <circle cx="100" cy="100" r="48" fill="var(--ccmc-panel)" />
        {active ? (
          <>
            <text x="100" y="93" textAnchor="middle" fontSize="18" fontWeight="700"
              fill={active.color} style={{ fontFamily: 'Poppins, sans-serif' }}>
              {active.total.toLocaleString()}
            </text>
            <text x="100" y="107" textAnchor="middle" fontSize="7.5" fontWeight="600"
              fill="var(--ccmc-text-hint)">
              {active.factor.length > 14 ? active.factor.slice(0, 13) + '…' : active.factor}
            </text>
            <text x="100" y="118" textAnchor="middle" fontSize="7" fill="var(--ccmc-text-hint)">
              {Math.round((active.total / total) * 100)}% of total
            </text>
          </>
        ) : (
          <>
            <text x="100" y="97" textAnchor="middle" fontSize="18" fontWeight="700"
              fill="var(--ccmc-text)" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {total.toLocaleString()}
            </text>
            <text x="100" y="112" textAnchor="middle" fontSize="8" fill="var(--ccmc-text-hint)">
              risk factors
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 w-full px-2">
        {slices.map((s) => {
          const isSel = selected === s.factor;
          return (
            <div key={s.factor}
              onClick={() => onSelect(isSel ? null : s.factor)}
              className="flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 transition-all"
              style={{
                background: isSel ? `${s.color}15` : 'transparent',
                border: isSel ? `1px solid ${s.color}30` : '1px solid transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${s.color}0D`}
              onMouseLeave={e => e.currentTarget.style.background = isSel ? `${s.color}15` : 'transparent'}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[9px] truncate" style={{ color: 'var(--ccmc-text-sec)' }}>{s.factor}</span>
              <span className="text-[9px] font-bold ml-auto flex-shrink-0" style={{ color: s.color }}>{s.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Patient list panel ───────────────────────────────────────────────────── */
function PatientPanel({ factor, riskTier, user, openPatient, bright, onClear }) {
  const [patients, setPatients] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const PER = 30;

  const load = useCallback(() => {
    if (!factor && !riskTier) return;
    setLoading(true);
    const params = new URLSearchParams({ role: user.role, page, per_page: PER });
    if (factor)   params.set('risk_factor',   factor);
    if (riskTier) params.set('risk_category', riskTier);
    fetch(`${API}/patients?${params}`)
      .then(r => r.json())
      .then(d => { setPatients(d.patients || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [factor, riskTier, page, user.role]);

  useEffect(() => { setPage(1); }, [factor, riskTier]);
  useEffect(() => { load(); }, [load]);

  const tierKey = riskTier || 'Moderate';
  const tColors = TIER_COLORS[tierKey] || TIER_COLORS.Moderate;

  const RISK_STYLES = {
    Critical:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: '#FCA5A5', dot: '#EF4444'  },
    'Very High':{ bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#FDBA74', dot: '#F97316'  },
    High:       { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',  color: '#FDE047', dot: '#EAB308'  },
    Moderate:   { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#93C5FD', dot: '#3B82F6'  },
    Low:        { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  color: '#86EFAC', dot: '#22C55E'  },
  };

  const pages = Math.ceil(total / PER);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--ccmc-panel)',
        border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
        boxShadow: bright ? '0 4px 20px rgba(0,0,0,0.06)' : 'none',
      }}>

      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{
          background: bright
            ? `linear-gradient(90deg, ${tColors.light} 0%, #FFFFFF 100%)`
            : `${tColors.dark}09`,
          borderBottom: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
        }}>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: bright ? tColors.main : tColors.dark }} />
          <div>
            <div className="text-[13px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              {factor
                ? <><span style={{ color: bright ? tColors.main : tColors.dark }}>{factor}</span> — Patients</>
                : <><span style={{ color: bright ? tColors.main : tColors.dark }}>{riskTier}</span> Risk — Patients</>
              }
            </div>
            <div className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} mothers`}
              {factor && riskTier && ` · filtered to ${riskTier} tier`}
            </div>
          </div>
        </div>
        <button onClick={onClear}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ background: bright ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}
          onMouseEnter={e => e.currentTarget.style.background = bright ? '#E2E8F0' : 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = bright ? '#F1F5F9' : 'rgba(255,255,255,0.06)'}>
          <X className="w-3.5 h-3.5" style={{ color: 'var(--ccmc-text-hint)' }} />
        </button>
      </div>

      {/* Patient grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: bright ? tColors.main : tColors.dark }} />
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>
          No patients found
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {patients.map(p => {
            const s = RISK_STYLES[p.risk_category] || RISK_STYLES.Low;
            const tc = bright ? (TIER_COLORS[p.risk_category] || TIER_COLORS.Low) : null;
            return (
              <div key={p.uid} onClick={() => openPatient(p.uid)}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  background: bright ? '#FFFFFF' : 'var(--ccmc-surface)',
                  border: bright ? `1px solid ${tc?.main}35` : `1px solid ${s.border}`,
                  boxShadow: bright ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = bright ? tc?.light || '#F8FAFC' : s.bg;
                  e.currentTarget.style.boxShadow  = bright ? `0 4px 16px ${tc?.main}18` : 'none';
                  e.currentTarget.style.transform  = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = bright ? '#FFFFFF' : 'var(--ccmc-surface)';
                  e.currentTarget.style.boxShadow  = bright ? '0 1px 3px rgba(0,0,0,0.04)' : 'none';
                  e.currentTarget.style.transform  = 'none';
                }}>

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold truncate" style={{ color: 'var(--ccmc-text)' }}>
                      {p.mother_name || 'Unknown'}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                      {p.phc_display} · {p.hrt_name}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: bright ? tc?.light : s.bg,
                      color:      bright ? tc?.main  : s.color,
                      border:     `1px solid ${bright ? (tc?.main + '35') : s.border}`,
                    }}>
                    {p.risk_category}
                  </span>
                </div>

                {/* Risk factor chips */}
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {(p.risk_factors || []).slice(0, 4).map((f, i) => {
                    const isMatch = factor && f.toUpperCase() === factor;
                    return (
                      <span key={i}
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          background: isMatch
                            ? (bright ? '#2563EB' : '#3B9FFF')
                            : (bright ? tc?.light : `${s.dot}18`),
                          color: isMatch ? '#FFFFFF' : (bright ? tc?.main : s.color),
                          fontWeight: isMatch ? 700 : 600,
                        }}>
                        {f}
                      </span>
                    );
                  })}
                  {(p.risk_factors || []).length > 4 && (
                    <span className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                      +{(p.risk_factors || []).length - 4} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px]"
                  style={{ color: 'var(--ccmc-text-hint)' }}>
                  <span>{p.cell_no || 'No phone'}</span>
                  <span>EDD: {p.edd || '—'}{p.days_to_edd != null ? ` (${p.days_to_edd}d)` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40 transition-all"
            style={{
              background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.15)',
              color: bright ? '#2563EB' : '#3B9FFF',
            }}>
            ← Prev
          </button>
          <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
            Page {page} of {pages} · {total.toLocaleString()} total
          </span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40 transition-all"
            style={{
              background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.15)',
              color: bright ? '#2563EB' : '#3B9FFF',
            }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function RiskIntelligence({ user, openPatient }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const [factors,        setFactors]        = useState([]);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [selectedFactor, setSelectedFactor] = useState(null);
  const [filterTier,     setFilterTier]     = useState(null);  // null = all tiers
  const [chartMode,      setChartMode]      = useState('bar'); // 'bar' | 'pie'
  const [showAll,        setShowAll]        = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingFactors(true);
    fetch(`${API}/risk-factor-analytics?role=${user.role}`)
      .then(r => r.json())
      .then(d => { setFactors(Array.isArray(d) ? d : []); })
      .catch(() => {})
      .finally(() => setLoadingFactors(false));
  }, [user]);

  // When tier filter changes, clear factor selection
  const handleTierChange = (tier) => {
    setFilterTier(tier === filterTier ? null : tier);
    setSelectedFactor(null);
  };

  // Factors filtered by selected tier
  const displayFactors = filterTier
    ? factors
        .map(f => ({ ...f, total: f.tier_counts?.[filterTier] || 0 }))
        .filter(f => f.total > 0)
        .sort((a, b) => b.total - a.total)
    : factors;

  const showPatients = selectedFactor || filterTier;
  const panelKey = `${selectedFactor}__${filterTier}`;

  const cardStyle = {
    background: 'var(--ccmc-panel)',
    border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
    boxShadow: bright ? '0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.04)' : 'none',
  };

  return (
    <div className="space-y-5 fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold"
            style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.3px', fontWeight: bright ? 800 : 700 }}>
            Risk Intelligence
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {loadingFactors
              ? 'Loading…'
              : `${factors.length} distinct risk factors across ${factors.reduce((s, f) => s + f.total, 0).toLocaleString()} factor-instances — click any bar, slice, or tier to drill down`
            }
          </p>
        </div>

        {/* Chart type toggle */}
        <div className="flex rounded-xl overflow-hidden"
          style={{ border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)' }}>
          {[['bar', 'Bar'], ['pie', 'Pie']].map(([mode, label]) => (
            <button key={mode} onClick={() => setChartMode(mode)}
              className="px-4 py-2 text-[11px] font-bold transition-all"
              style={{
                background: chartMode === mode
                  ? (bright ? '#2563EB' : '#3B9FFF')
                  : 'var(--ccmc-panel)',
                color: chartMode === mode ? '#FFFFFF' : 'var(--ccmc-text-hint)',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Risk tier filter strip ───────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => handleTierChange(null)}
          className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all"
          style={{
            background: !filterTier ? (bright ? '#0F766E' : '#3B9FFF') : 'var(--ccmc-panel)',
            color: !filterTier ? '#FFFFFF' : 'var(--ccmc-text-hint)',
            border: `1px solid ${!filterTier ? 'transparent' : 'var(--ccmc-border)'}`,
          }}>
          All Tiers
        </button>
        {TIERS.map(tier => {
          const tc  = TIER_COLORS[tier];
          const sel = filterTier === tier;
          return (
            <button key={tier} onClick={() => handleTierChange(tier)}
              className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all"
              style={{
                background: sel ? (bright ? tc.main : tc.dark) : 'var(--ccmc-panel)',
                color:      sel ? '#FFFFFF' : (bright ? tc.main : tc.dark),
                border:     sel ? 'none' : `1px solid ${bright ? tc.main + '40' : tc.dark + '40'}`,
                boxShadow:  sel ? `0 3px 12px ${tc.main}40` : 'none',
              }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ background: sel ? 'rgba(255,255,255,0.7)' : (bright ? tc.main : tc.dark) }} />
              {tier}
            </button>
          );
        })}
      </div>

      {/* ── Chart + patients layout ─────────────────────────────────── */}
      <div className={showPatients ? 'grid grid-cols-1 xl:grid-cols-2 gap-5' : ''}>

        {/* Chart card */}
        <div className="rounded-2xl p-5" style={cardStyle}>

          {/* Chart header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: bright ? '#0F766E' : '#3B9FFF' }} />
              <h2 className="text-[13px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
                {filterTier ? `${filterTier} Risk` : 'All'} — Factor Distribution
              </h2>
            </div>
            {selectedFactor && (
              <button onClick={() => setSelectedFactor(null)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.12)', color: bright ? '#2563EB' : '#3B9FFF' }}>
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {loadingFactors ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--ccmc-border-s)', borderTopColor: bright ? '#0F766E' : '#3B9FFF' }} />
            </div>
          ) : chartMode === 'bar' ? (
            <>
              {/* Tier mini-legend */}
              <div className="flex gap-3 flex-wrap mb-4 pb-4"
                style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
                {TIERS.map(t => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: bright ? TIER_COLORS[t].main : TIER_COLORS[t].dark }} />
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ccmc-text-hint)' }}>{t}</span>
                  </div>
                ))}
              </div>
              <BarChart
                factors={showAll ? displayFactors : displayFactors.slice(0, 15)}
                onSelect={(f) => { setSelectedFactor(f); }}
                selected={selectedFactor}
                bright={bright}
              />
              {displayFactors.length > 15 && (
                <button onClick={() => setShowAll(v => !v)}
                  className="flex items-center gap-1 mx-auto mt-4 text-[11px] font-semibold"
                  style={{ color: bright ? '#0F766E' : '#3B9FFF' }}>
                  {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showAll ? 'Show fewer' : `Show all ${displayFactors.length} factors`}
                </button>
              )}
            </>
          ) : (
            <PieChart
              factors={displayFactors}
              onSelect={(f) => { setSelectedFactor(f); }}
              selected={selectedFactor}
              bright={bright}
            />
          )}
        </div>

        {/* Patient panel — appears when something is selected */}
        {showPatients && (
          <PatientPanel
            key={panelKey}
            factor={selectedFactor}
            riskTier={!selectedFactor ? filterTier : null}
            user={user}
            openPatient={openPatient}
            bright={bright}
            onClear={() => { setSelectedFactor(null); setFilterTier(null); }}
          />
        )}
      </div>

      {/* ── Summary stats strip ─────────────────────────────────────── */}
      {!loadingFactors && factors.length > 0 && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[13px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              Risk Tier Summary
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              Click a tier to filter charts above
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TIERS.map(tier => {
              const tc    = TIER_COLORS[tier];
              const count = factors.reduce((s, f) => s + (f.tier_counts?.[tier] || 0), 0);
              const isSel = filterTier === tier;
              return (
                <button key={tier} onClick={() => handleTierChange(tier)}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{
                    background: isSel
                      ? (bright ? tc.light : `${tc.dark}15`)
                      : (bright ? '#F8FAFC' : 'var(--ccmc-surface)'),
                    border: `1px solid ${isSel ? (bright ? tc.main + '50' : tc.dark + '40') : (bright ? '#E2E8F0' : 'var(--ccmc-border)')}`,
                    boxShadow: isSel ? `0 4px 16px ${tc.main}20` : 'none',
                  }}>
                  <div className="text-[20px] font-bold leading-none mb-1"
                    style={{ color: bright ? tc.main : tc.dark, fontFamily: 'Poppins, sans-serif' }}>
                    {count.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: bright ? tc.main : tc.dark }}>
                    {tier}
                  </div>
                  <div className="text-[9px] mt-1" style={{ color: 'var(--ccmc-text-hint)' }}>
                    factor instances
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
