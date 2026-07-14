import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../ThemeContext';
import {
  Activity, X, Users, ChevronRight, Search,
  BarChart2, PieChart as PieIcon, RefreshCw,
  AlertTriangle, TrendingUp, Filter, Table2,
} from 'lucide-react';

const API = '/api';

const GROUP_ORDER = [
  'Surgical','Obstetric','Fetal','Hemorrhage','Maternal',
  'Hypertensive','Metabolic','Blood','Cardiac','Neurological',
  'Infection','Renal','Hepatic','Respiratory','Autoimmune','Mental',
];

/* ── Polar / Arc helpers ─────────────────────────────────────────────────── */
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(cx, cy, r, s, e) {
  if (e - s >= 360) e = s + 359.99;
  const p1 = polar(cx, cy, r, s), p2 = polar(cx, cy, r, e);
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${p2.x} ${p2.y} Z`;
}

/* ── Donut chart ─────────────────────────────────────────────────────────── */
function DonutChart({ factors, selected, onSelect, bright }) {
  const [hov, setHov] = useState(null);
  const top = factors.slice(0, 14);
  const total = top.reduce((s, f) => s + f.total, 0) || 1;
  let ang = 0;
  const slices = top.map(f => {
    const sweep = (f.total / total) * 360;
    const sl = { ...f, s: ang, e: ang + sweep };
    ang += sweep; return sl;
  });
  const active = hov ?? (selected ? slices.find(s => s.factor === selected) : null);
  return (
    <div className="flex gap-6 items-start flex-wrap">
      <div className="flex-shrink-0">
        <svg viewBox="0 0 220 220" width="220" height="220" style={{ overflow: 'visible' }}>
          {slices.map(sl => {
            const isSel = selected === sl.factor || hov?.factor === sl.factor;
            return (
              <path key={sl.factor} d={arc(110, 110, isSel ? 96 : 88, sl.s, sl.e)}
                fill={sl.color} opacity={isSel ? 1 : (hov || selected) ? 0.4 : 0.88}
                stroke="var(--ccmc-panel)" strokeWidth={2}
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={() => setHov(sl)} onMouseLeave={() => setHov(null)}
                onClick={() => onSelect(selected === sl.factor ? null : sl.factor)} />
            );
          })}
          <circle cx="110" cy="110" r="54" fill="var(--ccmc-panel)" />
          {active ? (
            <>
              <text x="110" y="103" textAnchor="middle" fontSize="20" fontWeight="800"
                fill={active.color} fontFamily="Poppins,sans-serif">{active.total.toLocaleString()}</text>
              <text x="110" y="116" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="var(--ccmc-text-hint)">
                {active.factor.length > 16 ? active.factor.slice(0, 15) + '…' : active.factor}
              </text>
              <text x="110" y="127" textAnchor="middle" fontSize="7" fill="var(--ccmc-text-hint)">
                {Math.round((active.total / total) * 100)}% of total
              </text>
            </>
          ) : (
            <>
              <text x="110" y="106" textAnchor="middle" fontSize="22" fontWeight="800"
                fill="var(--ccmc-text)" fontFamily="Poppins,sans-serif">{total.toLocaleString()}</text>
              <text x="110" y="120" textAnchor="middle" fontSize="8" fill="var(--ccmc-text-hint)">patient-factor instances</text>
            </>
          )}
        </svg>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1 min-w-0 self-center">
        {slices.map(sl => {
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
              <span className="text-[10px] font-bold ml-auto flex-shrink-0" style={{ color: sl.color }}>{sl.total}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bar chart ───────────────────────────────────────────────────────────── */
function BarChartView({ factors, selected, onSelect, bright }) {
  const [hov, setHov] = useState(null);
  const max = factors[0]?.total || 1;
  return (
    <div className="space-y-1.5">
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
            className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all"
            style={{
              background: isSel ? (bright ? `${f.color}12` : `${f.color}18`) : isHov ? (bright ? '#F8FAFC' : 'rgba(255,255,255,0.04)') : 'transparent',
              border: isSel ? `1px solid ${f.color}35` : '1px solid transparent',
            }}>
            <span className="text-[10px] font-bold w-5 text-right flex-shrink-0"
              style={{ color: active ? f.color : 'var(--ccmc-text-hint)' }}>{i + 1}</span>
            <div className="w-44 flex-shrink-0">
              <div className="text-[11px] font-semibold leading-tight truncate"
                style={{ color: active ? f.color : 'var(--ccmc-text)' }}>{f.factor}</div>
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>{f.group}</div>
            </div>
            <div className="flex-1 relative rounded-full overflow-hidden"
              style={{ height: 18, background: bright ? '#E2E8F0' : 'rgba(255,255,255,0.07)' }}>
              <div className="absolute top-0 left-0 h-full rounded-full transition-all"
                style={{ width: `${barW}%`, background: f.color, opacity: active ? 1 : 0.78 }} />
              {barW > 25 && (
                <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] font-bold z-10"
                  style={{ color: '#FFFFFF', mixBlendMode: 'overlay' }}>
                  {f.total.toLocaleString()}
                </span>
              )}
            </div>
            <span className="text-[12px] font-bold w-14 text-right flex-shrink-0"
              style={{ color: active ? f.color : (bright ? '#334155' : 'var(--ccmc-text)') }}>
              {f.total.toLocaleString()}
            </span>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: f.color, opacity: active ? 0.8 : 0, transition: 'opacity 0.15s' }} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Official Count Table ────────────────────────────────────────────────── */
function CountTable({ factors, selected, onSelect, bright }) {
  const displayed = factors.map(f => ({ ...f, displayCount: f.total }));

  const grandTotal = displayed.reduce((s, f) => s + f.displayCount, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr style={{ background: bright ? '#F8FAFC' : 'rgba(255,255,255,0.04)' }}>
            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--ccmc-text-hint)', borderBottom: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)', width: 40 }}>
              #
            </th>
            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--ccmc-text-hint)', borderBottom: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)' }}>
              Risk Factor / Category
            </th>
            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--ccmc-text-hint)', borderBottom: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)', textAlign: 'right' }}>
              Mothers
            </th>
            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider hidden md:table-cell"
              style={{ color: 'var(--ccmc-text-hint)', borderBottom: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)', textAlign: 'right' }}>
              % of DB
            </th>
            <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--ccmc-text-hint)', borderBottom: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)' }}>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((f, i) => {
            const isSel = selected === f.factor;
            const pct   = grandTotal > 0 ? (f.displayCount / grandTotal * 100).toFixed(1) : '0.0';
            const dbPct = (f.displayCount / 6674 * 100).toFixed(1);
            return (
              <tr key={f.factor}
                onClick={() => onSelect(isSel ? null : f.factor)}
                style={{
                  background: isSel
                    ? (bright ? `${f.color}0C` : `${f.color}12`)
                    : (i % 2 === 0 ? 'transparent' : (bright ? '#FAFAFA' : 'rgba(255,255,255,0.015)')),
                  cursor: 'pointer',
                  borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = bright ? `${f.color}08` : `${f.color}0A`; }}
                onMouseLeave={e => {
                  if (!isSel) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : (bright ? '#FAFAFA' : 'rgba(255,255,255,0.015)');
                }}>
                {/* # */}
                <td className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--ccmc-text-hint)' }}>{i + 1}</td>
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                    <span className="text-[12px] font-semibold" style={{ color: isSel ? f.color : 'var(--ccmc-text)' }}>
                      {f.factor}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full hidden md:inline"
                      style={{ background: bright ? '#F1F5F9' : 'rgba(255,255,255,0.07)', color: 'var(--ccmc-text-hint)' }}>
                      {f.group}
                    </span>
                  </div>
                </td>
                {/* Count */}
                <td className="px-4 py-3 text-right">
                  <span className="text-[14px] font-bold" style={{ color: f.color, fontFamily: 'Poppins,sans-serif' }}>
                    {f.displayCount.toLocaleString()}
                  </span>
                </td>
                {/* % */}
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full overflow-hidden"
                      style={{ background: bright ? '#E2E8F0' : 'rgba(255,255,255,0.1)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(parseFloat(dbPct) * 3, 100)}%`, background: f.color }} />
                    </div>
                    <span className="text-[11px] font-semibold w-10 text-right"
                      style={{ color: 'var(--ccmc-text-sec)' }}>
                      {dbPct}%
                    </span>
                  </div>
                </td>
                {/* Action */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-[10px] font-semibold"
                    style={{ color: isSel ? f.color : 'var(--ccmc-text-hint)' }}>
                    <Users className="w-3 h-3" />
                    <span className="hidden sm:inline">View</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Patient drawer (fixed overlay) ─────────────────────────────────────── */
function PatientPanel({ factor, factorColor, user, openPatient, bright, onClear }) {
  const [patients, setPatients] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const PER = 20;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ role: user.role, page, per_page: PER });
    if (factor) params.set('risk_factor', factor);
    if (search)  params.set('search',     search);
    fetch(`${API}/patients?${params}`)
      .then(r => r.json())
      .then(d => { setPatients(d.patients || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [factor, page, search, user.role]);

  useEffect(() => { setPage(1); }, [factor, search]);
  useEffect(() => { load(); }, [load]);

  const headerColor = factorColor || '#2563EB';
  const pages = Math.ceil(total / PER);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClear}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: bright ? 'rgba(15,23,42,0.18)' : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 500, zIndex: 50,
        background: 'var(--ccmc-panel)',
        borderLeft: bright ? `2px solid ${headerColor}30` : '1px solid var(--ccmc-border)',
        boxShadow: bright ? `-8px 0 40px ${headerColor}14` : '-4px 0 32px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0"
          style={{
            background: bright ? `linear-gradient(135deg,${headerColor}10,${headerColor}05)` : `${headerColor}09`,
            borderBottom: bright ? `1px solid ${headerColor}20` : '1px solid var(--ccmc-border)',
          }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: headerColor }} />
                <h3 className="text-[13px] font-bold leading-snug" style={{ color: 'var(--ccmc-text)' }}>
                  {factor || 'Patients'}
                </h3>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                {loading ? 'Loading…' : `${total.toLocaleString()} patients matched`}
              </div>
            </div>
            <button onClick={onClear}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: bright ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}
              onMouseEnter={e => e.currentTarget.style.background = bright ? '#E2E8F0' : 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = bright ? '#F1F5F9' : 'rgba(255,255,255,0.06)'}>
              <X className="w-4 h-4" style={{ color: 'var(--ccmc-text-hint)' }} />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ccmc-text-hint)' }} />
            <input type="text" placeholder="Search by name, phone, PHC…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-[11px] outline-none"
              style={{
                background: bright ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.06)',
                border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
                color: 'var(--ccmc-text)',
              }} />
          </div>
        </div>

        {/* Patient list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: headerColor }} />
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-16 text-[12px]" style={{ color: 'var(--ccmc-text-hint)' }}>No patients found</div>
          ) : patients.map(pt => (
            <button key={pt.uid} onClick={() => openPatient(pt.uid)}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                background: bright ? '#FFFFFF' : 'var(--ccmc-surface)',
                border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
                boxShadow: bright ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = bright ? '#F8FAFC' : 'rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = bright ? '0 4px 16px rgba(0,0,0,0.08)' : 'none';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = bright ? '#FFFFFF' : 'var(--ccmc-surface)';
                e.currentTarget.style.boxShadow = bright ? '0 1px 4px rgba(0,0,0,0.05)' : 'none';
              }}>
              <div className="mb-1.5">
                <div className="text-[13px] font-bold leading-tight" style={{ color: 'var(--ccmc-text)' }}>
                  {pt.mother_name || 'Unknown'}
                </div>
              </div>
              <div className="text-[10px] mb-2.5" style={{ color: 'var(--ccmc-text-hint)' }}>
                {pt.phc_display} · {pt.hrt_name}
              </div>
              {(pt.risk_factors || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {(pt.risk_factors || []).map((f2, idx) => (
                    <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                      style={{
                        background: bright ? '#F1F5F9' : 'rgba(255,255,255,0.09)',
                        color: bright ? '#475569' : 'var(--ccmc-text-hint)',
                        border: bright ? '1px solid #E2E8F0' : 'none',
                      }}>
                      {f2}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-[10px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                <span>{pt.cell_no || 'No phone'}</span>
                <span>EDD: {pt.edd || '—'}{pt.days_to_edd != null ? ` (${pt.days_to_edd}d)` : ''}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderTop: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
              style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.15)', color: bright ? '#2563EB' : '#60A5FA' }}>
              Prev
            </button>
            <span className="text-[11px]" style={{ color: 'var(--ccmc-text-hint)' }}>
              {page} / {pages} · {total.toLocaleString()} patients
            </span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
              style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.15)', color: bright ? '#2563EB' : '#60A5FA' }}>
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function RiskIntelligence({ user, openPatient }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const [factors,      setFactors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [viewMode,     setViewMode]     = useState('table'); // 'table' | 'bar' | 'pie'
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

  const groups = [...new Set(factors.map(f => f.group))].sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
  );

  const displayed = factors
    .filter(f => filterGroup ? f.group === filterGroup : true)
    .sort((a, b) => b.total - a.total);

  const visibleFactors = showAll ? displayed : displayed.slice(0, 25);
  const grandTotal  = factors.reduce((s, f) => s + f.total, 0);
  const selectedObj = factors.find(f => f.factor === selectedFact);
  const showPanel   = !!selectedFact;

  const cardStyle = {
    background: 'var(--ccmc-panel)',
    border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)',
    boxShadow: bright ? '0 1px 4px rgba(0,0,0,0.04),0 6px 24px rgba(0,0,0,0.04)' : 'none',
  };

  return (
    <div className="space-y-5 fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold"
            style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif',
              letterSpacing: '-0.4px', fontWeight: bright ? 800 : 700 }}>
            High-Risk Pregnancy Analytics
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
            {loading ? 'Loading…'
              : `Official CCMC classification · ${factors.length} categories · ${(6674).toLocaleString()} mothers screened · click any row to view patients`
            }
          </p>
        </div>
        {/* View mode toggle */}
        <div className="flex rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: bright ? '1px solid #E2E8F0' : '1px solid var(--ccmc-border)' }}>
          {[['table', Table2, 'Table'], ['bar', BarChart2, 'Bar'], ['pie', PieIcon, 'Pie']].map(([mode, Icon, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-all"
              style={{
                background: viewMode === mode ? (bright ? '#0F766E' : '#3B9FFF') : 'var(--ccmc-panel)',
                color: viewMode === mode ? '#FFFFFF' : 'var(--ccmc-text-hint)',
              }}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI summary ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Mothers Screened',       value: (6674).toLocaleString(),    color: bright ? '#0F766E' : '#3B9FFF', icon: Users },
          { label: 'Risk Factor Categories', value: factors.length,             color: bright ? '#2563EB' : '#60A5FA', icon: BarChart2 },
          { label: 'Total Factor Instances', value: grandTotal.toLocaleString(), color: bright ? '#7C3AED' : '#A78BFA', icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-5" style={cardStyle}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${color}15` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-[26px] font-bold leading-none mb-1"
              style={{ color, fontFamily: 'Poppins,sans-serif', letterSpacing: '-1px' }}>
              {value}
            </div>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--ccmc-text-hint)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5" style={{ color: bright ? '#0F766E' : '#3B9FFF' }} />
          <span className="text-[12px] font-bold" style={{ color: 'var(--ccmc-text)' }}>Filter by Category</span>
          {filterGroup && (
            <button onClick={() => { setFilterGroup(null); setSelectedFact(null); }}
              className="text-[10px] font-semibold ml-2 px-2 py-0.5 rounded-lg"
              style={{ background: bright ? '#FEE2E2' : 'rgba(239,68,68,0.12)', color: '#DC2626' }}>
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.map(g => {
            const sel = filterGroup === g;
            return (
              <button key={g}
                onClick={() => { setFilterGroup(sel ? null : g); setSelectedFact(null); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: sel ? (bright ? '#0F766E' : '#3B9FFF') : 'var(--ccmc-surface)',
                  color: sel ? '#FFFFFF' : 'var(--ccmc-text-hint)',
                  border: `1px solid ${sel ? 'transparent' : (bright ? '#E2E8F0' : 'var(--ccmc-border)')}`,
                  boxShadow: sel ? '0 2px 8px rgba(15,118,110,0.3)' : 'none',
                }}>
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main chart/table ────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: bright ? '#0F766E' : '#3B9FFF' }} />
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--ccmc-text)' }}>
              {filterGroup ?? 'All Factors'}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.12)', color: bright ? '#2563EB' : '#60A5FA' }}>
              {displayed.length} categories
            </span>
          </div>
          {selectedFact && (
            <button onClick={() => setSelectedFact(null)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: bright ? '#EFF6FF' : 'rgba(37,99,235,0.12)', color: bright ? '#2563EB' : '#60A5FA' }}>
              <X className="w-3 h-3" /> Clear selection
            </button>
          )}
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: bright ? '#0F766E' : '#3B9FFF' }} />
            </div>
          ) : viewMode === 'table' ? (
            <CountTable factors={visibleFactors} selected={selectedFact}
              onSelect={f => setSelectedFact(f === selectedFact ? null : f)} bright={bright} />
          ) : viewMode === 'bar' ? (
            <>
              <BarChartView factors={visibleFactors} selected={selectedFact}
                onSelect={f => setSelectedFact(f === selectedFact ? null : f)} bright={bright} />
              {displayed.length > 25 && (
                <button onClick={() => setShowAll(v => !v)}
                  className="mt-4 mx-auto block text-[11px] font-semibold"
                  style={{ color: bright ? '#0F766E' : '#3B9FFF' }}>
                  {showAll ? 'Show fewer' : `Show all ${displayed.length} factors`}
                </button>
              )}
            </>
          ) : (
            <DonutChart factors={visibleFactors} selected={selectedFact}
              onSelect={f => setSelectedFact(f === selectedFact ? null : f)} bright={bright} />
          )}
        </div>
      </div>

      {/* Patient drawer — fixed overlay, renders on top immediately */}
      {showPanel && (
        <PatientPanel
          key={selectedFact}
          factor={selectedFact}
          factorColor={selectedObj?.color}
          user={user}
          openPatient={openPatient}
          bright={bright}
          onClear={() => setSelectedFact(null)}
        />
      )}
    </div>
  );
}
