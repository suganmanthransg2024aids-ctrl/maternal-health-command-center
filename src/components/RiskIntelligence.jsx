import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '../ThemeContext';
import {
  Activity, X, Users, ChevronRight, Search,
  BarChart2, PieChart as PieIcon, RefreshCw,
  AlertTriangle, TrendingUp, Filter,
} from 'lucide-react';

const API = '/api';

const RISK_TIER_CFG = {
  Critical:   { main: '#DC2626', light: '#FEF2F2', dark: '#EF4444', text: '#B91C1C' },
  'Very High':{ main: '#EA580C', light: '#FFF7ED', dark: '#F97316', text: '#C2410C' },
  High:       { main: '#B45309', light: '#FFFBEB', dark: '#EAB308', text: '#92400E' },
  Moderate:   { main: '#1D4ED8', light: '#EFF6FF', dark: '#3B82F6', text: '#1E40AF' },
  Low:        { main: '#059669', light: '#F0FDF4', dark: '#22C55E', text: '#065F46' },
};
const TIERS = ['Critical', 'Very High', 'High', 'Moderate', 'Low'];

const GROUP_ORDER = [
  'Obstetric','Hypertensive','Metabolic','Blood','Maternal',
  'Cardiac','Hemorrhage','Fetal','Infection','Respiratory',
  'Renal','Hepatic','Neurological','Mental','Vascular','Chronic',
];

/* ── SVG Arc helper ───────────────────────────────────────────────────────── */
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(cx, cy, r, s, e) {
  if (e - s >= 360) e = s + 359.99;
  const p1 = polar(cx, cy, r, s), p2 = polar(cx, cy, r, e);
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${p2.x} ${p2.y} Z`;
}

/* ── Donut Pie Chart ──────────────────────────────────────────────────────── */
function DonutChart({ factors, selected, onSelect, bright }) {
  const [hov, setHov] = useState(null);
  const top = factors.slice(0, 14);
  const total = top.reduce((s, f) => s + f.total, 0) || 1;

  let ang = 0;
  const slices = top.map(f => {
    const sweep = (f.total / total) * 360;
    const sl = { ...f, s: ang, e: ang + sweep };
    ang += sweep;
    return sl;
  });

  const active = hov ?? (selected ? slices.find(s => s.factor === selected) : null);

  return (
    <div className="flex gap-6 items-start flex-wrap">
      {/* SVG donut */}
      <div className="flex-shrink-0">
        <svg viewBox="0 0 220 220" width="220" height="220" style={{ overflow: 'visible' }}>
          {slices.map((sl) => {
            const isSel = selected === sl.factor || hov?.factor === sl.factor;
            const r = isSel ? 96 : 88;
            return (
              <path key={sl.factor}
                d={arc(110, 110, r, sl.s, sl.e)}
                fill={sl.color}
                opacity={isSel ? 1 : (hov || selected) ? 0.4 : 0.88}
                stroke="var(--ccmc-panel)" strokeWidth={2}
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHov(sl)}
                onMouseLeave={() => setHov(null)}
                onClick={() => onSelect(selected === sl.factor ? null : sl.factor)}
              />
            );
          })}
          {/* Donut hole */}
          <circle cx="110" cy="110" r="54" fill="var(--ccmc-panel)" />
          {/* Center text */}
          {active ? (
            <>
              <text x="110" y="103" textAnchor="middle" fontSize="20" fontWeight="800"
                fill={active.color} fontFamily="Poppins, sans-serif">{active.total.toLocaleString()}</text>
              <text x="110" y="116" textAnchor="middle" fontSize="7.5" fontWeight="600"
                fill="var(--ccmc-text-hint)">
                {active.factor.length > 16 ? active.factor.slice(0, 15) + '…' : active.factor}
              </text>
              <text x="110" y="127" textAnchor="middle" fontSize="7" fill="var(--ccmc-text-hint)">
                {Math.round((active.total / total) * 100)}% of total
              </text>
            </>
          ) : (
            <>
              <text x="110" y="106" textAnchor="middle" fontSize="22" fontWeight="800"
                fill="var(--ccmc-text)" fontFamily="Poppins, sans-serif">{total.toLocaleString()}</text>
              <text x="110" y="120" textAnchor="middle" fontSize="8" fill="var(--ccmc-text-hint)">
                patient-factor instances
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 grid grid-cols-2 gap-1 min-w-0 self-center">
        {slices.map((sl) => {
          const isSel = selected === sl.factor;
          return (
            <button key={sl.factor} onClick={() => onSelect(isSel ? null : sl.factor)}
              className="flex items-center gap-2 text-left px-2 py-1.5 rounded-lg transition-all"
              style={{
                background: isSel ? `${sl.color}15` : 'transparent',
                border: isSel ? `1px solid ${sl.color}30` : '1px solid transparent',
              }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = `${sl.color}0A`; }}
              onMouseLeave={e => { e.currentTarget.style.background = isSel ? `${sl.color}15` : 'transparent'; }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sl.color }} />
              <span className="text-[10px] truncate" style={{ color: 'var(--ccmc-text-sec)' }}>{sl.factor}</span>
              <span className="text-[10px] font-bold ml-auto flex-shrink-0" style={{ color: sl.color }}>
                {sl.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bar Chart ────────────────────────────────────────────────────────────── */
function BarChartView({ factors, selected, onSelect, filterTier, bright }) {
  const [hov, setHov] = useState(null);
  const max = factors[0]?.total || 1;

  return (
    <div className="space-y-2">
      {/* Tier legend */}
      <div className="flex gap-3 flex-wrap mb-4 pb-3"
        style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
        {TIERS.map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm"
              style={{ background: bright ? RISK_TIER_CFG[t].main : RISK_TIER_CFG[t].dark }} />
            <span className="text-[10px] font-medium" style={{ color: 'var(--ccmc-text-hint)' }}>{t}</span>
          </div>
        ))}
      </div>

      {factors.map((f, i) => {
        const isSel = selected === f.factor;
        const isHov = hov === f.factor;
        const barW  = Math.max((f.total / max) * 100, 1);
        const active = isSel || isHov;

        return (
          <div key={f.factor}
            onClick={() => onSelect(isSel ? null : f.factor)}
            onMouseEnter={() => setHov(f.factor)}
            onMouseLeave={() => setHov(null)}
            className="group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all"
            style={{
              background: isSel
                ? (bright ? `${f.color}12` : `${f.color}18`)
                : isHov ? (bright ? '#F8FAFC' : 'rgba(255,255,255,0.04)') : 'transparent',
              border: isSel
                ? `1px solid ${f.color}35`
                : '1px solid transparent',
            }}>

            {/* Rank */}
            <span className="text-[10px] font-bold w-5 text-right flex-shrink-0"
              style={{ color: active ? f.color : 'var(--ccmc-text-hint)' }}>
              {i + 1}
            </span>

            {/* Factor label */}
            <div className="w-44 flex-shrink-0">
              <div className="text-[11px] font-semibold leading-tight truncate"
                style={{ color: active ? f.color : 'var(--ccmc-text)' }}>
                {f.factor}
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
                {f.group}
              </div>
            </div>

            {/* Stacked bar */}
            <div className="flex-1 relative rounded-full overflow-hidden"
              style={{ height: 18, background: bright ? '#E2E8F0' : 'rgba(255,255,255,0.07)' }}>
              {(() => {
                let offset = 0;
                return TIERS.map(tier => {
                  const cnt  = filterTier
                    ? (tier === filterTier ? (f.tier_counts?.[tier] || 0) : 0)
                    : (f.tier_counts?.[tier] || 0);
                  const segW = (cnt / f.total) * barW;
                  if (segW < 0.2) { offset += segW; return null; }
                  const seg = (
                    <div key={tier} className="absolute top-0 h-full transition-all duration-500"
                      style={{
                        left: `${offset}%`, width: `${segW}%`,
                        background: bright ? RISK_TIER_CFG[tier].main : RISK_TIER_CFG[tier].dark,
                        opacity: active ? 1 : 0.78,
                      }} />
                  );
                  offset += segW;
                  return seg;
                });
              })()}
              {/* Count label on bar */}
              <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] font-bold z-10"
                style={{ color: active ? '#FFFFFF' : 'var(--ccmc-text-hint)', mixBlendMode: 'auto' }}>
                {barW > 30 && f.total.toLocaleString()}
              </span>
            </div>

            {/* Count (always visible) */}
            <span className="text-[12px] font-bold w-14 text-right flex-shrink-0"
              style={{ color: active ? f.color : (bright ? '#334155' : 'var(--ccmc-text)') }}>
              {f.total.toLocaleString()}
            </span>

            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-opacity"
              style={{ color: f.color, opacity: active ? 0.8 : 0 }} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Patient panel ────────────────────────────────────────────────────────── */
function PatientPanel({ factor, factorColor, filterTier, user, openPatient, bright, onClear }) {
  const [patients, setPatients] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const PER = 24;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ role: user.role, page, per_page: PER });
    if (factor)     params.set('risk_factor',   factor);
    if (filterTier) params.set('risk_category', filterTier);
    if (search)     params.set('search',        search);
    fetch(`${API}/patients?${params}`)
      .then(r => r.json())
      .then(d => { setPatients(d.patients || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [factor, filterTier, page, search, user.role]);

  useEffect(() => { setPage(1); }, [factor, filterTier, search]);
  useEffect(() => { load(); }, [load]);

  const tc = RISK_TIER_CFG[filterTier] || {};
  const headerColor = factorColor || tc.main || '#2563EB';
  const pages = Math.ceil(total / PER);

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--ccmc-panel)',
        border: bright ? `1px solid ${headerColor}30` : '1px solid var(--ccmc-border)',
        boxShadow: bright ? `0 4px 24px ${headerColor}12` : 'none',
      }}>

      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0"
        style={{
          background: bright
            ? `linear-gradient(135deg, ${headerColor}12, ${headerColor}06)`
            : `${headerColor}09`,
          borderBottom: bright ? `1px solid ${headerColor}20` : '1px solid var(--ccmc-border)',
        }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: headerColor }} />
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
                {factor || `${filterTier} Risk`}
              </h3>
            </div>
            <div className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} patients`}
              {factor && filterTier && ` · ${filterTier} tier`}
            </div>
          </div>
          <button onClick={onClear}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: bright ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = bright ? '#E2E8F0' : 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = bright ? '#F1F5F9' : 'rgba(255,255,255,0.06)'}>
            <X className="w-3.5 h-3.5" style={{ color: 'var(--ccmc-text-hint)' }} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--ccmc-text-hint)' }} />
          <input
            type="text"
            placeholder="Search by name, phone, PHC…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[11px] outline-none"
            style={{
              background: bright ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.06)',
              border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
              color: 'var(--ccmc-text)',
            }}
          />
        </div>
      </div>

      {/* Patient grid */}
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 480 }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: headerColor }} />
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-10 text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>
            No patients found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {patients.map(p => {
              const tc2 = RISK_TIER_CFG[p.risk_category] || RISK_TIER_CFG.Low;
              return (
                <button key={p.uid} onClick={() => openPatient(p.uid)}
                  className="text-left rounded-xl p-3.5 transition-all"
                  style={{
                    background: bright ? '#FFFFFF' : 'var(--ccmc-surface)',
                    border: bright ? `1px solid ${tc2.main}28` : '1px solid var(--ccmc-border)',
                    boxShadow: bright ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = bright ? tc2.light : `${tc2.dark}0A`;
                    e.currentTarget.style.boxShadow  = bright ? `0 4px 16px ${tc2.main}15` : 'none';
                    e.currentTarget.style.transform  = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = bright ? '#FFFFFF' : 'var(--ccmc-surface)';
                    e.currentTarget.style.boxShadow  = bright ? '0 1px 3px rgba(0,0,0,0.04)' : 'none';
                    e.currentTarget.style.transform  = 'none';
                  }}>

                  {/* Name + badge */}
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="text-[12px] font-bold leading-tight truncate"
                      style={{ color: 'var(--ccmc-text)' }}>
                      {p.mother_name || 'Unknown'}
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: bright ? tc2.light : `${tc2.dark}15`,
                        color: bright ? tc2.text : tc2.dark,
                      }}>
                      {p.risk_category}
                    </span>
                  </div>

                  {/* PHC + HRT */}
                  <div className="text-[10px] mb-2" style={{ color: 'var(--ccmc-text-hint)' }}>
                    {p.phc_display} · {p.hrt_name}
                  </div>

                  {/* Risk factor chips */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(p.risk_factors || []).slice(0, 3).map((f2, idx) => {
                      const isMatch = factor && f2.toUpperCase().includes(factor.split('/')[0].trim().toUpperCase().slice(0, 4));
                      return (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                          style={{
                            background: isMatch
                              ? (bright ? headerColor : headerColor)
                              : (bright ? '#F1F5F9' : 'rgba(255,255,255,0.08)'),
                            color: isMatch ? '#FFFFFF' : 'var(--ccmc-text-hint)',
                          }}>
                          {f2}
                        </span>
                      );
                    })}
                    {(p.risk_factors || []).length > 3 && (
                      <span className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                        +{p.risk_factors.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Phone + EDD */}
                  <div className="flex justify-between text-[10px]"
                    style={{ color: 'var(--ccmc-text-hint)' }}>
                    <span>{p.cell_no || 'No phone'}</span>
                    <span>EDD: {p.edd || '—'}{p.days_to_edd != null ? ` (${p.days_to_edd}d)` : ''}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderTop: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
            style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.15)',
              color: bright ? '#2563EB' : '#60A5FA' }}>
            ← Prev
          </button>
          <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
            {page} / {pages} · {total.toLocaleString()} patients
          </span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
            style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.15)',
              color: bright ? '#2563EB' : '#60A5FA' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function RiskIntelligence({ user, openPatient }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const [factors,      setFactors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [chartMode,    setChartMode]    = useState('bar');
  const [filterTier,   setFilterTier]   = useState(null);
  const [filterGroup,  setFilterGroup]  = useState(null);
  const [selectedFact, setSelectedFact] = useState(null);
  const [showAll,      setShowAll]      = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${API}/risk-factor-analytics?role=${user.role}`)
      .then(r => r.json())
      .then(d => setFactors(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Groups present in data
  const groups = [...new Set(factors.map(f => f.group))].sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
  );

  // Filter + sort
  const displayed = factors
    .filter(f => {
      if (filterTier) {
        const count = f.tier_counts?.[filterTier] || 0;
        if (count === 0) return false;
      }
      if (filterGroup && f.group !== filterGroup) return false;
      return true;
    })
    .map(f => filterTier
      ? { ...f, total: f.tier_counts?.[filterTier] || 0 }
      : f
    )
    .sort((a, b) => b.total - a.total);

  const visibleFactors = showAll ? displayed : displayed.slice(0, 20);

  // KPI totals
  const grandTotal     = factors.reduce((s, f) => s + f.total, 0);
  const criticalCount  = factors.reduce((s, f) => s + (f.tier_counts?.Critical || 0), 0);
  const factorCount    = factors.length;

  const selectedFactObj = factors.find(f => f.factor === selectedFact);
  const showPanel = selectedFact || filterTier;

  const cardStyle = {
    background: 'var(--ccmc-panel)',
    border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
    boxShadow: bright ? '0 1px 4px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.04)' : 'none',
  };

  return (
    <div className="space-y-5 fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold"
            style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.4px', fontWeight: bright ? 800 : 700 }}>
            High-Risk Pregnancy Analytics
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {loading ? 'Loading…' :
              `${factorCount} standardised risk factors · ${grandTotal.toLocaleString()} patient-factor instances · click any factor to view patients`
            }
          </p>
        </div>
        {/* Chart toggle */}
        <div className="flex rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)' }}>
          {[['bar', BarChart2, 'Bar'], ['pie', PieIcon, 'Pie']].map(([mode, Icon, label]) => (
            <button key={mode} onClick={() => setChartMode(mode)}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all"
              style={{
                background: chartMode === mode ? (bright ? '#0F766E' : '#3B9FFF') : 'var(--ccmc-panel)',
                color: chartMode === mode ? '#FFFFFF' : 'var(--ccmc-text-hint)',
              }}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary KPI strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Risk-Factor Instances', value: grandTotal.toLocaleString(),
            color: bright ? '#0F766E' : '#3B9FFF', icon: TrendingUp },
          { label: 'Distinct Risk Factors',       value: factorCount,
            color: bright ? '#2563EB' : '#60A5FA', icon: BarChart2 },
          { label: 'Critical Tier Patients',      value: criticalCount.toLocaleString(),
            color: bright ? '#DC2626' : '#EF4444', icon: AlertTriangle },
          { label: 'Patients Screened (Total)',   value: (6594).toLocaleString(),
            color: bright ? '#7C3AED' : '#A78BFA', icon: Users },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <div className="text-[28px] font-bold leading-none mb-1"
              style={{ color, fontFamily: 'Poppins, sans-serif', letterSpacing: '-1px' }}>
              {value}
            </div>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--ccmc-text-hint)' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter controls ─────────────────────────────────────────── */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5" style={{ color: bright ? '#0F766E' : '#3B9FFF' }} />
          <span className="text-[12px] font-bold" style={{ color: 'var(--ccmc-text)' }}>Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">

          {/* All button */}
          <button onClick={() => { setFilterTier(null); setFilterGroup(null); setSelectedFact(null); }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: !filterTier && !filterGroup ? (bright ? '#0F766E' : '#3B9FFF') : 'var(--ccmc-surface)',
              color: !filterTier && !filterGroup ? '#FFFFFF' : 'var(--ccmc-text-hint)',
              border: `1px solid ${!filterTier && !filterGroup ? 'transparent' : (bright ? '#E2E8F0' : 'var(--ccmc-border)')}`,
            }}>
            All Factors
          </button>

          {/* Tier buttons */}
          {TIERS.map(tier => {
            const tc = RISK_TIER_CFG[tier];
            const sel = filterTier === tier;
            return (
              <button key={tier}
                onClick={() => { setFilterTier(sel ? null : tier); setSelectedFact(null); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: sel ? (bright ? tc.main : tc.dark) : (bright ? tc.light : `${tc.dark}12`),
                  color: sel ? '#FFFFFF' : (bright ? tc.text : tc.dark),
                  border: `1px solid ${sel ? 'transparent' : (bright ? tc.main + '40' : tc.dark + '30')}`,
                  boxShadow: sel ? `0 2px 8px ${tc.main}35` : 'none',
                }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ background: sel ? 'rgba(255,255,255,0.6)' : (bright ? tc.main : tc.dark) }} />
                {tier}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px" style={{ background: 'var(--ccmc-border)' }} />

          {/* Group buttons */}
          {groups.map(g => {
            const sel = filterGroup === g;
            return (
              <button key={g}
                onClick={() => { setFilterGroup(sel ? null : g); setSelectedFact(null); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: sel ? (bright ? '#2563EB' : '#3B9FFF') : 'var(--ccmc-surface)',
                  color: sel ? '#FFFFFF' : 'var(--ccmc-text-hint)',
                  border: `1px solid ${sel ? 'transparent' : (bright ? '#E2E8F0' : 'var(--ccmc-border)')}`,
                }}>
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chart + Patient panel ───────────────────────────────────── */}
      <div className={showPanel ? 'grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-5' : ''}>

        {/* Chart card */}
        <div className="rounded-2xl p-5" style={cardStyle}>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: bright ? '#0F766E' : '#3B9FFF' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
                {filterGroup ?? (filterTier ? `${filterTier} Risk` : 'All')} — Factor Distribution
              </h2>
              {displayed.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.12)',
                    color: bright ? '#2563EB' : '#60A5FA',
                  }}>
                  {displayed.length} factors
                </span>
              )}
            </div>
            {selectedFact && (
              <button onClick={() => setSelectedFact(null)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.12)',
                  color: bright ? '#2563EB' : '#60A5FA' }}>
                <X className="w-3 h-3" /> Clear selection
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin"
                style={{ color: bright ? '#0F766E' : '#3B9FFF' }} />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              No factors match current filters
            </div>
          ) : chartMode === 'bar' ? (
            <>
              <BarChartView
                factors={visibleFactors}
                selected={selectedFact}
                onSelect={f => setSelectedFact(f)}
                filterTier={filterTier}
                bright={bright}
              />
              {displayed.length > 20 && (
                <button onClick={() => setShowAll(v => !v)}
                  className="mt-4 mx-auto block text-[11px] font-semibold"
                  style={{ color: bright ? '#0F766E' : '#3B9FFF' }}>
                  {showAll ? '▲ Show fewer' : `▼ Show all ${displayed.length} factors`}
                </button>
              )}
            </>
          ) : (
            <DonutChart
              factors={visibleFactors}
              selected={selectedFact}
              onSelect={f => setSelectedFact(f)}
              bright={bright}
            />
          )}
        </div>

        {/* Patient panel */}
        {showPanel && (
          <PatientPanel
            key={`${selectedFact}__${filterTier}`}
            factor={selectedFact}
            factorColor={selectedFactObj?.color}
            filterTier={!selectedFact ? filterTier : null}
            user={user}
            openPatient={openPatient}
            bright={bright}
            onClear={() => { setSelectedFact(null); setFilterTier(null); }}
          />
        )}
      </div>

      {/* ── Group summary grid ──────────────────────────────────────── */}
      {!loading && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              Factor Categories
            </h2>
            <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              Click to filter
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {groups.map(g => {
              const gFactors = factors.filter(f => f.group === g);
              const gTotal   = gFactors.reduce((s, f) => s + f.total, 0);
              const gColor   = gFactors[0]?.color || '#64748B';
              const isSel    = filterGroup === g;
              return (
                <button key={g} onClick={() => { setFilterGroup(isSel ? null : g); setSelectedFact(null); }}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: isSel
                      ? (bright ? `${gColor}18` : `${gColor}15`)
                      : (bright ? '#F8FAFC' : 'var(--ccmc-surface)'),
                    border: `1px solid ${isSel ? gColor + '40' : (bright ? '#E2E8F0' : 'var(--ccmc-border)')}`,
                    boxShadow: isSel ? `0 4px 16px ${gColor}18` : 'none',
                  }}>
                  <div className="text-[18px] font-bold leading-none mb-1"
                    style={{ color: gColor, fontFamily: 'Poppins, sans-serif' }}>
                    {gTotal.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: gColor }}>
                    {g}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                    {gFactors.length} factor{gFactors.length > 1 ? 's' : ''}
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
