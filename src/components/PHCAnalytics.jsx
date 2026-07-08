import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Brain, AlertTriangle,
  ChevronDown, ChevronUp, Search,
  Zap, ShieldAlert, CheckCircle, Phone, PhoneOff,
  Baby, Clock, List,
} from 'lucide-react';

const API = '/api';

const HRT_COLORS = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

const GRADE_META = {
  A: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  label: 'Low Burden' },
  B: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', label: 'Moderate' },
  C: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'High' },
  D: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  label: 'Critical' },
};

const ALERT_META = {
  'Delivery Surge':      { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', icon: Zap },
  'Intervention Needed': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: ShieldAlert },
  'At-Risk':             { color: '#F87171', bg: 'rgba(248,113,113,0.12)', icon: AlertTriangle },
  'Stable':              { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle },
};

function GradeBadge({ grade }) {
  const m = GRADE_META[grade] || GRADE_META.B;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black flex-shrink-0"
      style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}>
      {grade}
    </span>
  );
}

function AlertPill({ alert }) {
  const m = ALERT_META[alert] || ALERT_META['Stable'];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: m.bg, color: m.color }}>
      <Icon className="w-3 h-3" />
      {alert}
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 60 ? '#EF4444' : score >= 40 ? '#F59E0B' : score >= 20 ? '#60A5FA' : '#22C55E';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(30,58,95,0.4)' }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

const RISK_COLOR = {
  'Critical':  '#EF4444',
  'Very High': '#F97316',
  'High':      '#F59E0B',
  'Moderate':  '#60A5FA',
  'Low':       '#22C55E',
};

function DaysChip({ days, delivered }) {
  if (delivered) return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Delivered</span>;
  if (days === null || days === undefined) return <span className="text-slate-600 text-[10px]">—</span>;
  if (days < 0)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>Overdue {Math.abs(days)}d</span>;
  if (days <= 7) return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}>{days}d</span>;
  if (days <= 30)return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>{days}d</span>;
  return <span className="text-[10px] text-slate-400">{days}d</span>;
}

function PHCCard({ p, expanded, onToggle, user, openPatient }) {
  const color  = HRT_COLORS[p.hrt_code] || '#42A5F5';
  const grade  = GRADE_META[p.grade]    || GRADE_META.B;
  const [mothers,     setMothers]     = useState(null);
  const [loadingM,    setLoadingM]    = useState(false);
  const [search,      setSearch]      = useState('');
  const [motherTab,   setMotherTab]   = useState('all'); // all | overdue | due7 | nophone

  const loadMothers = useCallback(() => {
    if (mothers !== null) return;
    setLoadingM(true);
    fetch(`${API}/phc/${p.phc_key}/mothers?role=${user.role}`)
      .then(r => r.json())
      .then(d => { setMothers(d); setLoadingM(false); })
      .catch(() => setLoadingM(false));
  }, [p.phc_key, user.role, mothers]);

  useEffect(() => {
    if (expanded) loadMothers();
  }, [expanded, loadMothers]);

  const filteredMothers = (mothers || []).filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.mother_name.toLowerCase().includes(q) ||
      m.cell_no.includes(q) ||
      m.rch_id?.includes(q);
    if (!matchSearch) return false;
    if (motherTab === 'overdue') return !m.is_delivered && m.days_to_edd !== null && m.days_to_edd < 0;
    if (motherTab === 'due7')    return !m.is_delivered && m.days_to_edd !== null && m.days_to_edd >= 0 && m.days_to_edd <= 7;
    if (motherTab === 'nophone') return !m.cell_no || m.cell_no === '';
    return true;
  });

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: 'var(--ccmc-panel)', border: `1px solid ${expanded ? grade.border : 'rgba(30,58,95,0.5)'}` }}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
        <GradeBadge grade={p.grade} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white truncate">{p.phc_display}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${color}15`, color }}>
              {p.hrt_code} · {p.hrt_name}
            </span>
          </div>
          <div className="mt-1.5"><ScoreBar score={p.risk_score} /></div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <AlertPill alert={p.alert} />
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-white">{p.total}</div>
            <div className="text-[10px] text-slate-500">mothers</div>
          </div>
          <div className="text-slate-500">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'rgba(30,58,95,0.4)' }}>

          {/* Stats row */}
          <div className="px-4 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Risk %',   value: `${p.risk_pct}%`, color: p.risk_pct > 50 ? '#EF4444' : p.risk_pct > 25 ? '#F59E0B' : '#22C55E' },
              { label: 'Due ≤7d',  value: p.due_soon,       color: p.due_soon >= 5 ? '#A78BFA' : '#94A3B8' },
              { label: 'No Phone', value: p.no_phone,       color: p.no_phone >= 5 ? '#F59E0B' : '#94A3B8' },
              { label: 'Overdue',  value: p.overdue,        color: p.overdue  >= 3 ? '#EF4444' : '#94A3B8' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center"
                style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(30,58,95,0.4)' }}>
                <div className="text-lg font-black" style={{ color: s.color, fontFamily: 'Poppins,sans-serif' }}>{s.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top factors + AI summary */}
          <div className="px-4 pb-3 space-y-3">
            {p.top_factors?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {p.top_factors.map((f, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{
                      background: i === 0 ? 'rgba(239,68,68,0.12)' : i === 1 ? 'rgba(245,158,11,0.12)' : 'rgba(96,165,250,0.12)',
                      color:      i === 0 ? '#FCA5A5' : i === 1 ? '#FDE68A' : '#BAE6FD',
                      border:     `1px solid ${i === 0 ? 'rgba(239,68,68,0.25)' : i === 1 ? 'rgba(245,158,11,0.25)' : 'rgba(96,165,250,0.25)'}`,
                    }}>
                    #{i + 1} {f.name} ({f.count})
                  </span>
                ))}
              </div>
            )}
            <div className="rounded-lg p-3" style={{ background: 'rgba(30,58,95,0.2)', border: '1px solid rgba(30,58,95,0.4)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Brain className="w-3.5 h-3.5" style={{ color: '#60A5FA' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#60A5FA' }}>AI Summary</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#CBD5E1' }}>{p.summary}</p>
            </div>
          </div>

          {/* ── Mother Records ─────────────────────────────────── */}
          <div className="border-t" style={{ borderColor: 'rgba(30,58,95,0.4)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <List className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-white">All Mothers</span>
                {mothers && <span className="text-[10px] text-slate-500">({filteredMothers.length} / {mothers.length})</span>}
              </div>
              {/* Filter tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'all',     label: 'All' },
                  { id: 'overdue', label: '⚠ Overdue' },
                  { id: 'due7',    label: '🔔 Due ≤7d' },
                  { id: 'nophone', label: '📵 No Phone' },
                ].map(t => (
                  <button key={t.id} onClick={() => setMotherTab(t.id)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      background: motherTab === t.id ? 'rgba(25,118,210,0.25)' : 'transparent',
                      color:      motherTab === t.id ? '#60A5FA' : '#64748B',
                      border:     `1px solid ${motherTab === t.id ? 'rgba(25,118,210,0.4)' : 'rgba(30,58,95,0.4)'}`,
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or phone..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(30,58,95,0.5)' }}
                />
              </div>
            </div>

            {/* Table */}
            {loadingM ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
              </div>
            ) : (
              <div className="overflow-x-auto" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: '#0A1628', borderBottom: '1px solid rgba(30,58,95,0.6)' }}>
                      {['#', 'Name', 'Phone', 'EDD', 'Days', 'Hb', 'Weeks', 'Risk', 'Last Visit'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#475569', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontSize: '10px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMothers.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '11px' }}>No records match</td></tr>
                    ) : filteredMothers.map((m, i) => {
                      const riskColor = RISK_COLOR[m.risk_category] || '#64748B';
                      const rowBg = m.is_delivered
                        ? 'rgba(34,197,94,0.04)'
                        : m.days_to_edd !== null && m.days_to_edd < 0
                          ? 'rgba(239,68,68,0.06)'
                          : m.days_to_edd !== null && m.days_to_edd <= 7
                            ? 'rgba(167,139,250,0.06)'
                            : 'transparent';
                      return (
                        <tr key={m.uid}
                          onClick={() => openPatient && openPatient(m.uid)}
                          style={{ background: rowBg, borderBottom: '1px solid rgba(30,58,95,0.25)', cursor: openPatient ? 'pointer' : 'default' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,58,95,0.3)'}
                          onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                          <td style={{ padding: '6px 10px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                          <td style={{ padding: '6px 10px', color: '#E2E8F0', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.mother_name || '—'}
                          </td>
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                            {m.cell_no ? (
                              <span style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Phone style={{ width: 10, height: 10 }} />{m.cell_no}
                              </span>
                            ) : (
                              <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <PhoneOff style={{ width: 10, height: 10 }} />No phone
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '6px 10px', color: '#94A3B8', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {m.edd || '—'}
                          </td>
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                            <DaysChip days={m.days_to_edd} delivered={m.is_delivered} />
                          </td>
                          <td style={{ padding: '6px 10px', color: '#E2E8F0', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {m.hb || '—'}
                          </td>
                          <td style={{ padding: '6px 10px', color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
                            {m.weeks || '—'}
                          </td>
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: riskColor, fontWeight: 700, fontSize: 10 }}>
                              {m.risk_category || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', color: '#64748B', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {m.last_visit_date || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PHCAnalytics({ user, openPatient }) {
  const [insights,   setInsights]   = useState([]);
  const [basicData,  setBasicData]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterHRT,  setFilterHRT]  = useState('');
  const [sortBy,     setSortBy]     = useState('risk_score');
  const [expanded,   setExpanded]   = useState({});
  const [tab,        setTab]        = useState('ai');  // 'ai' | 'table'

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/phc/ai-insights?role=${user.role}`).then(r => r.json()),
      fetch(`${API}/phc-analytics?role=${user.role}`).then(r => r.json()),
    ])
      .then(([ai, basic]) => { setInsights(ai); setBasicData(basic); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.role]);

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // HRT summary from basic data
  const hrtGroups = {};
  basicData.forEach(p => {
    const k = p.hrt_code;
    if (!hrtGroups[k]) hrtGroups[k] = { hrt_code: k, hrt_name: p.hrt_name, total: 0, delivered: 0, due_soon: 0, phcs: [] };
    hrtGroups[k].total    += p.total;
    hrtGroups[k].delivered += p.delivered;
    hrtGroups[k].due_soon  += p.due_soon;
    hrtGroups[k].phcs.push(p.phc_display);
  });
  const hrtSummary = Object.values(hrtGroups).sort((a, b) => b.total - a.total);

  const filtered = insights
    .filter(p => !filterHRT || p.hrt_code === filterHRT)
    .sort((a, b) => {
      if (sortBy === 'risk_score') return b.risk_score - a.risk_score;
      if (sortBy === 'total')      return b.total      - a.total;
      if (sortBy === 'due_soon')   return b.due_soon   - a.due_soon;
      if (sortBy === 'no_phone')   return b.no_phone   - a.no_phone;
      return 0;
    });

  const top3 = [...insights].sort((a, b) => b.risk_score - a.risk_score).slice(0, 3);

  const totalMothers = basicData.reduce((s, d) => s + d.total, 0);
  const gradeCount = { A: 0, B: 0, C: 0, D: 0 };
  insights.forEach(p => { if (gradeCount[p.grade] !== undefined) gradeCount[p.grade]++; });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <Brain className="w-5 h-5" style={{ color: '#60A5FA' }} />
            AI PHC Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} PHC / UPHCs · {totalMothers.toLocaleString()} mothers · AI risk scoring active
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(25,118,210,0.2)', border: '1px solid rgba(25,118,210,0.4)', color: '#42A5F5' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Grade summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(GRADE_META).map(([g, m]) => (
          <div key={g} className="rounded-xl p-3 text-center"
            style={{ background: m.bg, border: `1px solid ${m.border}` }}>
            <div className="text-2xl font-black" style={{ color: m.color, fontFamily: 'Poppins,sans-serif' }}>
              {gradeCount[g]}
            </div>
            <div className="text-[10px] font-bold mt-0.5" style={{ color: m.color }}>Grade {g}</div>
            <div className="text-[10px] text-slate-500">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Top 3 At-Risk PHCs */}
      {top3.length > 0 && (
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />
            <span className="text-sm font-bold" style={{ color: '#FCA5A5' }}>Top 3 Priority PHCs</span>
            <span className="text-[10px] text-slate-600">· highest AI risk scores</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((p, i) => {
              const grade = GRADE_META[p.grade] || GRADE_META.B;
              return (
                <div key={p.phc_key} className="rounded-lg p-3"
                  style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid ${grade.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black" style={{ color: '#EF4444' }}>#{i + 1}</span>
                    <GradeBadge grade={p.grade} />
                    <span className="text-xs font-bold text-white truncate">{p.phc_display}</span>
                  </div>
                  <AlertPill alert={p.alert} />
                  <div className="mt-2">
                    <ScoreBar score={p.risk_score} />
                  </div>
                  <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                    <span style={{ color: '#A78BFA' }}>{p.due_soon} due soon</span>
                    <span style={{ color: '#F87171' }}>{p.risk_pct}% risk</span>
                    {p.no_phone > 0 && <span style={{ color: '#F59E0B' }}>{p.no_phone} no phone</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HRT Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hrtSummary.map(h => {
          const color = HRT_COLORS[h.hrt_code] || '#42A5F5';
          return (
            <div key={h.hrt_code}
              onClick={() => setFilterHRT(filterHRT === h.hrt_code ? '' : h.hrt_code)}
              className="rounded-xl p-4 cursor-pointer transition-all"
              style={{
                background: filterHRT === h.hrt_code ? `${color}10` : '#0F172A',
                border: `1px solid ${filterHRT === h.hrt_code ? `${color}40` : 'rgba(30,58,95,0.7)'}`,
              }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: color }}>{h.hrt_code.slice(-1)}</div>
                <div>
                  <div className="text-xs font-bold text-white">{h.hrt_code}</div>
                  <div className="text-[10px] text-slate-500">{h.hrt_name}</div>
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color }}>{h.total.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {h.phcs.length} PHC{h.phcs.length !== 1 ? 's' : ''} ·
                <span style={{ color: '#A78BFA' }}> {h.due_soon} due soon</span>
              </div>
              <div className="mt-2 h-1 rounded-full" style={{ background: 'rgba(30,58,95,0.4)' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.round(h.delivered / (h.total || 1) * 100)}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'ai',    label: 'AI Insights' },
          { id: 'table', label: 'Table View' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              background: tab === t.id ? 'rgba(25,118,210,0.2)' : 'transparent',
              color:      tab === t.id ? '#42A5F5' : '#64748B',
              border:     `1px solid ${tab === t.id ? 'rgba(25,118,210,0.4)' : 'rgba(30,58,95,0.4)'}`,
            }}>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[10px] text-slate-500">Sort:</span>
        {['risk_score', 'total', 'due_soon', 'no_phone'].map(s => (
          <button key={s} onClick={() => setSortBy(s)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: sortBy === s ? 'rgba(25,118,210,0.2)' : 'transparent',
              color:      sortBy === s ? '#42A5F5' : '#64748B',
              border:     `1px solid ${sortBy === s ? 'rgba(25,118,210,0.4)' : 'rgba(30,58,95,0.4)'}`,
            }}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
        </div>
      ) : tab === 'ai' ? (
        /* AI Cards view */
        <div className="space-y-2">
          {filtered.map(p => (
            <PHCCard
              key={p.phc_key}
              p={p}
              expanded={!!expanded[p.phc_key]}
              onToggle={() => toggleExpand(p.phc_key)}
              user={user}
              openPatient={openPatient}
            />
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.7)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(30,58,95,0.7)' }}>
            <h2 className="text-sm font-bold text-white">Detailed PHC Table</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Grade</th><th>PHC / UPHC</th><th>HRT</th>
                  <th className="text-right">Score</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Risk %</th>
                  <th className="text-right">Due ≤7d</th>
                  <th className="text-right">No Phone</th>
                  <th className="text-right">Overdue</th>
                  <th>Alert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.phc_key}>
                    <td><GradeBadge grade={p.grade} /></td>
                    <td className="font-semibold text-white">{p.phc_display}</td>
                    <td>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${HRT_COLORS[p.hrt_code] || '#42A5F5'}15`, color: HRT_COLORS[p.hrt_code] || '#42A5F5' }}>
                        {p.hrt_code}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="font-bold" style={{
                        color: p.risk_score >= 60 ? '#EF4444' : p.risk_score >= 40 ? '#F59E0B' : p.risk_score >= 20 ? '#60A5FA' : '#22C55E'
                      }}>{p.risk_score}</span>
                    </td>
                    <td className="text-right font-bold text-white">{p.total}</td>
                    <td className="text-right">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: p.risk_pct > 50 ? 'rgba(239,68,68,0.15)' : p.risk_pct > 25 ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)',
                          color:      p.risk_pct > 50 ? '#FCA5A5'              : p.risk_pct > 25 ? '#FDBA74'              : '#86EFAC',
                        }}>{p.risk_pct}%</span>
                    </td>
                    <td className="text-right" style={{ color: '#A78BFA' }}>{p.due_soon}</td>
                    <td className="text-right" style={{ color: '#F59E0B' }}>{p.no_phone}</td>
                    <td className="text-right" style={{ color: p.overdue > 0 ? '#EF4444' : '#64748B' }}>{p.overdue}</td>
                    <td><AlertPill alert={p.alert} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
