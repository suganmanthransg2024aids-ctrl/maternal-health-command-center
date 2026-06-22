import React, { useState, useCallback, useEffect } from 'react';
import { Phone, RefreshCw, ChevronDown, ChevronUp, X, AlertTriangle, Calendar, BarChart2 } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

const HRT_COLORS = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

const STAT_COLS = [
  { key: 'total_mothers',     label: 'Assigned',    color: '#93C5FD', drillStatus: null },
  { key: 'calls_attempted',   label: 'Attempted',   color: '#60A5FA', drillStatus: '' },
  { key: 'calls_connected',   label: 'Connected',   color: '#22C55E', drillStatus: 'Connected' },
  { key: 'no_response',       label: 'No Response', color: '#EF4444', drillStatus: 'No Response' },
  { key: 'switched_off',      label: 'Switched Off',color: '#94A3B8', drillStatus: 'Switched Off' },
  { key: 'wrong_number',      label: 'Wrong No.',   color: '#F97316', drillStatus: 'Wrong Number' },
  { key: 'call_back_later',   label: 'Call Back',   color: '#60A5FA', drillStatus: 'Call Back Later' },
  { key: 'followup_required', label: 'Follow-Up',   color: '#A78BFA', drillStatus: 'Follow-Up Required' },
  { key: 'resolved',          label: 'Resolved',    color: '#34D399', drillStatus: 'Resolved' },
  { key: 'calls_pending',     label: 'Pending',     color: '#64748B', drillStatus: 'Pending' },
  { key: 'followups_due',     label: 'FU Due',      color: '#F59E0B', drillStatus: null },
];

const STATUS_COLORS = {
  'Connected': '#22C55E', 'No Response': '#EF4444',
  'Switched Off': '#94A3B8', 'Wrong Number': '#F97316',
  'Call Back Later': '#60A5FA', 'Follow-Up Required': '#A78BFA',
  'Resolved': '#34D399', 'Pending': '#64748B',
};

const NON_CONNECTED_KEYS = ['no_response', 'switched_off', 'wrong_number'];

/* ── Drill-down modal ─────────────────────────────────────────────────────── */
function DrillModal({ hrtCode, hrtName, status, date, role, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams({ role });
    p.set('hrt', hrtCode);
    if (status) p.set('status', status);
    if (date)   p.set('date',   date);
    fetch(`${API}/calls?${p}`)
      .then(r => r.json())
      .then(d => { setRows(d.records || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [hrtCode, status, date, role]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-5xl rounded-2xl flex flex-col" style={{ maxHeight: '88vh', background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.9)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(30,58,95,0.7)' }}>
          <div>
            <h3 className="text-sm font-bold text-white">{hrtName} — {status || 'All Calls'}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{rows.length} mothers · {date || 'All dates'}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">No records found</div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>Mother Name</th><th>PHC</th><th>Phone</th>
                <th>Call Status</th><th>Call Date</th><th>Caller</th><th>Remarks</th><th>Next Follow-Up</th>
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.uid}>
                    <td><div className="font-semibold text-white max-w-[160px] truncate">{r.mother_name || '—'}</div></td>
                    <td className="text-xs text-slate-400">{r.phc_display}</td>
                    <td className="text-xs text-slate-400">{r.cell_no || '—'}</td>
                    <td>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${STATUS_COLORS[r.call_status] || '#94A3B8'}18`, color: STATUS_COLORS[r.call_status] || '#94A3B8', border: `1px solid ${STATUS_COLORS[r.call_status] || '#94A3B8'}30` }}>
                        {r.call_status || 'Pending'}
                      </span>
                    </td>
                    <td className="text-[10px] text-slate-400">{r.last_call_date || '—'}</td>
                    <td className="text-[10px] text-slate-400">{r.caller_name || '—'}</td>
                    <td><div className="text-[10px] text-slate-400 max-w-[140px] truncate">{r.remarks || '—'}</div></td>
                    <td className="text-[10px] text-blue-300">{r.next_followup_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Weekly card for one HRT ─────────────────────────────────────────────── */
function WeeklyCard({ hrt, maxDay, bright }) {
  const color  = HRT_COLORS[hrt.hrt_code] || '#42A5F5';
  const todayD = hrt.daily.find(d => d.is_today);
  const ncToday = todayD ? todayD.not_connected : 0;
  const hasAlert = ncToday >= 5;
  const pct = hrt.total_mothers > 0 ? Math.round((hrt.week_connected / hrt.total_mothers) * 100) : 0;

  return (
    <div className="rounded-xl p-4"
      style={{
        background: bright ? '#FFFFFF' : 'var(--ccmc-surface)',
        border: hasAlert
          ? '1px solid rgba(239,68,68,0.5)'
          : bright ? `1px solid ${color}25` : `1px solid ${color}20`,
        boxShadow: hasAlert
          ? '0 0 0 2px rgba(239,68,68,0.12)'
          : bright ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
      }}>

      {/* HRT header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded"
              style={{ background: `${color}20`, color }}>
              {hrt.hrt_code}
            </span>
            <span className="text-[12px] font-bold" style={{ color: bright ? '#1E293B' : '#F1F5F9' }}>
              {hrt.hrt_name}
            </span>
            {hasAlert && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                <AlertTriangle className="w-2.5 h-2.5" /> {ncToday} missed today
              </span>
            )}
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: bright ? '#94A3B8' : '#475569' }}>
            {hrt.phcs.slice(0, 3).join(' · ')}{hrt.phcs.length > 3 ? ` +${hrt.phcs.length - 3}` : ''}
          </div>
        </div>
        {/* Week progress */}
        <div className="text-right flex-shrink-0">
          <div className="text-[11px] font-bold" style={{ color }}>
            {hrt.week_attempted} <span style={{ color: bright ? '#94A3B8' : '#475569', fontWeight: 400 }}>calls</span>
          </div>
          <div className="text-[9px]" style={{ color: bright ? '#94A3B8' : '#475569' }}>
            <span style={{ color: '#22C55E' }}>{hrt.week_connected}✓</span>
            {' '}
            <span style={{ color: '#EF4444' }}>{hrt.week_not_connected}✗</span>
          </div>
        </div>
      </div>

      {/* Progress bar — weekly connected vs total mothers */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] mb-1" style={{ color: bright ? '#94A3B8' : '#475569' }}>
          <span>Week progress: {hrt.week_connected} connected of {hrt.total_mothers} assigned</span>
          <span style={{ color }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: bright ? '#E2E8F0' : 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
        </div>
      </div>

      {/* 7-day mini chart */}
      <div className="grid grid-cols-7 gap-1">
        {hrt.daily.map(d => {
          const barMax = maxDay || 1;
          const totalH  = Math.round((d.attempted   / barMax) * 44);
          const connH   = d.attempted > 0 ? Math.round((d.connected     / d.attempted) * totalH) : 0;
          const ncH     = d.attempted > 0 ? Math.round((d.not_connected / d.attempted) * totalH) : 0;
          const otherH  = Math.max(totalH - connH - ncH, 0);

          return (
            <div key={d.date} className="flex flex-col items-center gap-0.5">
              {/* Day label */}
              <div className="text-[8px] font-bold"
                style={{
                  color: d.is_today ? color : (bright ? '#94A3B8' : '#475569'),
                  textDecoration: d.is_today ? 'underline' : 'none',
                }}>
                {d.day}
              </div>
              {/* Bar */}
              <div className="w-full flex flex-col-reverse justify-start overflow-hidden rounded"
                style={{ height: 44, background: bright ? '#F1F5F9' : 'rgba(255,255,255,0.06)', position: 'relative' }}>
                {d.is_future ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px]" style={{ color: bright ? '#CBD5E1' : '#1E293B' }}>—</span>
                  </div>
                ) : d.attempted === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px]" style={{ color: bright ? '#CBD5E1' : '#1E293B' }}>0</span>
                  </div>
                ) : (
                  <>
                    {connH > 0  && <div style={{ height: connH,  background: '#22C55E',           width: '100%', flexShrink: 0 }} />}
                    {otherH > 0 && <div style={{ height: otherH, background: '#60A5FA',           width: '100%', flexShrink: 0 }} />}
                    {ncH > 0    && <div style={{ height: ncH,    background: '#EF4444',           width: '100%', flexShrink: 0 }} />}
                  </>
                )}
              </div>
              {/* Attempt count */}
              <div className="text-[8px] font-bold"
                style={{ color: d.is_today ? color : (bright ? '#475569' : '#64748B') }}>
                {d.is_future ? '' : d.attempted}
              </div>
              {/* Connected / missed */}
              {!d.is_future && d.attempted > 0 && (
                <div className="text-[7px] leading-none text-center">
                  <div style={{ color: '#22C55E' }}>{d.connected}✓</div>
                  {d.not_connected > 0 && <div style={{ color: '#EF4444' }}>{d.not_connected}✗</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function HRTCallPerformance({ user, defaultDate }) {
  const { theme } = useTheme();
  const bright = theme === 'bright';

  const today = new Date().toISOString().slice(0, 10);
  const [tab,      setTab]      = useState('daily');   // 'daily' | 'weekly'
  const [data,     setData]     = useState([]);
  const [weekly,   setWeekly]   = useState({ hrts: [], week_start: '', week_end: '' });
  const [loading,  setLoading]  = useState(false);
  const [date,     setDate]     = useState(defaultDate || today);
  const [drill,    setDrill]    = useState(null);
  const [expanded, setExpanded] = useState(true);

  const loadDaily = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ role: user.role });
    if (date) p.set('date', date);
    fetch(`${API}/hrt-call-performance?${p}`)
      .then(r => r.json())
      .then(d => { setData(d.hrts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.role, date]);

  const loadWeekly = useCallback(() => {
    setLoading(true);
    fetch(`${API}/hrt-weekly-performance?role=${user.role}`)
      .then(r => r.json())
      .then(d => { setWeekly(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.role]);

  useEffect(() => {
    if (tab === 'daily')  loadDaily();
    else                  loadWeekly();
  }, [tab, loadDaily, loadWeekly]);

  const openDrill = (hrt, col) => {
    if (col.drillStatus === null) return;
    setDrill({ hrtCode: hrt.hrt_code, hrtName: hrt.hrt_name, status: col.drillStatus });
  };

  const totals = STAT_COLS.reduce((acc, c) => {
    acc[c.key] = data.reduce((s, h) => s + (h[c.key] || 0), 0);
    return acc;
  }, {});

  /* max daily calls for weekly scaling */
  const maxDay = Math.max(
    1,
    ...weekly.hrts.flatMap(h => h.daily.map(d => d.attempted))
  );

  const panelBorder = bright ? '1px solid rgba(37,99,235,0.25)' : '1px solid rgba(66,165,245,0.35)';
  const panelBg     = bright ? '#FFFFFF' : 'var(--ccmc-panel)';

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: panelBg, border: panelBorder }}>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: bright ? '#E2E8F0' : 'rgba(30,58,95,0.7)' }}>
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4" style={{ color: bright ? '#2563EB' : '#42A5F5' }} />
          <h2 className="text-sm font-bold" style={{ color: bright ? '#1E293B' : '#F1F5F9' }}>
            HRT Call Performance
          </h2>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: bright ? '#EFF6FF' : 'rgba(66,165,245,0.15)', color: bright ? '#2563EB' : '#42A5F5' }}>
            LIVE
          </span>
          {/* Daily/Weekly tabs */}
          <div className="flex rounded-lg overflow-hidden ml-2"
            style={{ border: bright ? '1px solid #E2E8F0' : '1px solid rgba(30,58,95,0.6)' }}>
            {[['daily', BarChart2, 'Daily'], ['weekly', Calendar, 'Weekly']].map(([t, Icon, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold transition-all"
                style={{
                  background: tab === t ? (bright ? '#2563EB' : '#3B9FFF') : 'transparent',
                  color:      tab === t ? '#FFFFFF' : (bright ? '#64748B' : '#475569'),
                }}>
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'daily' && (
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-2 py-1 rounded text-xs outline-none"
              style={{
                background: bright ? '#F8FAFC' : 'rgba(15,23,42,0.8)',
                border:     bright ? '1px solid #E2E8F0' : '1px solid rgba(30,58,95,0.7)',
                color:      bright ? '#334155' : '#F1F5F9',
                colorScheme: 'dark',
              }} />
          )}
          {tab === 'weekly' && weekly.week_start && (
            <span className="text-[10px]" style={{ color: bright ? '#94A3B8' : '#475569' }}>
              {weekly.week_start} → {weekly.week_end}
            </span>
          )}
          <button onClick={tab === 'daily' ? loadDaily : loadWeekly} disabled={loading}
            className="p-1.5 rounded transition-all"
            style={{ background: bright ? '#EFF6FF' : 'rgba(25,118,210,0.2)', color: bright ? '#2563EB' : '#42A5F5' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded"
            style={{ color: bright ? '#94A3B8' : '#475569' }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* ── DAILY TAB ───────────────────────────────────────────── */}
          {tab === 'daily' && (
            <>
              {/* Summary strip */}
              {data.length > 0 && (
                <div className="grid px-5 py-2.5 border-b gap-2"
                  style={{
                    borderColor: bright ? '#F1F5F9' : 'rgba(30,58,95,0.5)',
                    gridTemplateColumns: `repeat(${STAT_COLS.length}, minmax(0,1fr))`,
                  }}>
                  {STAT_COLS.map(c => (
                    <div key={c.key} className="text-center">
                      <div className="text-sm font-bold" style={{ color: c.color }}>{totals[c.key] ?? 0}</div>
                      <div className="text-[8px] uppercase tracking-wide" style={{ color: bright ? '#94A3B8' : '#475569' }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 rounded-full animate-spin"
                      style={{ borderColor: bright ? '#DBEAFE' : '#1E3A5F', borderTopColor: bright ? '#2563EB' : '#42A5F5' }} />
                  </div>
                ) : data.length === 0 ? (
                  <div className="text-center py-8 text-xs" style={{ color: bright ? '#94A3B8' : '#475569' }}>
                    No call data for selected date
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: bright ? '1px solid #F1F5F9' : '1px solid rgba(30,58,95,0.5)' }}>
                        <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: bright ? '#64748B' : '#475569' }}>HRT</th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: bright ? '#64748B' : '#475569' }}>PHCs</th>
                        {STAT_COLS.map(c => (
                          <th key={c.key} className="text-center px-2 py-2.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                            style={{ color: c.color }}>{c.label}</th>
                        ))}
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: bright ? '#64748B' : '#475569' }}>Last Call</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(hrt => {
                        const hrtColor = HRT_COLORS[hrt.hrt_code] || '#42A5F5';
                        const ncToday  = (hrt.no_response || 0) + (hrt.switched_off || 0) + (hrt.wrong_number || 0);
                        const hasAlert = ncToday >= 5;
                        return (
                          <tr key={hrt.hrt_code}
                            style={{
                              borderBottom: bright ? '1px solid #F8FAFC' : '1px solid rgba(30,58,95,0.3)',
                              background: hasAlert ? (bright ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.04)') : 'transparent',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = bright ? '#F8FAFC' : 'rgba(25,118,210,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = hasAlert ? (bright ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.04)') : 'transparent'}>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${hrtColor}20`, color: hrtColor }}>{hrt.hrt_code}</span>
                                <span className="text-xs font-semibold whitespace-nowrap"
                                  style={{ color: bright ? '#1E293B' : '#F1F5F9' }}>{hrt.hrt_name}</span>
                                {hasAlert && (
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold"
                                    style={{ color: '#EF4444' }}>
                                    <AlertTriangle className="w-2.5 h-2.5" /> {ncToday} missed
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              <div className="text-[9px] max-w-[200px] leading-relaxed" style={{ color: bright ? '#94A3B8' : '#475569' }}>
                                {hrt.phcs.join(' · ')}
                              </div>
                            </td>

                            {STAT_COLS.map(c => {
                              const val = hrt[c.key] ?? 0;
                              const isDrillable = c.drillStatus !== null;
                              const isNcCol = NON_CONNECTED_KEYS.includes(c.key);
                              return (
                                <td key={c.key} className="px-2 py-3 text-center">
                                  {isDrillable ? (
                                    <button onClick={() => openDrill(hrt, c)}
                                      className="text-sm font-bold px-2 py-0.5 rounded transition-all min-w-[32px]"
                                      style={{
                                        color:      isNcCol && val >= 5 ? '#EF4444' : c.color,
                                        background: isNcCol && val >= 5 ? 'rgba(239,68,68,0.12)' : `${c.color}12`,
                                        fontWeight: isNcCol && val >= 5 ? 900 : 700,
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = `${c.color}28`; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = isNcCol && val >= 5 ? 'rgba(239,68,68,0.12)' : `${c.color}12`; e.currentTarget.style.transform = 'scale(1)'; }}>
                                      {val}
                                    </button>
                                  ) : (
                                    <span className="text-sm font-bold" style={{ color: c.color }}>{val}</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="px-3 py-3">
                              <div className="text-[10px] whitespace-nowrap" style={{ color: bright ? '#94A3B8' : '#475569' }}>
                                {hrt.last_call_date
                                  ? <>{hrt.last_call_date}{hrt.last_call_time && <span className="ml-1">{hrt.last_call_time}</span>}</>
                                  : '—'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── WEEKLY TAB ──────────────────────────────────────────── */}
          {tab === 'weekly' && (
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: bright ? '#DBEAFE' : '#1E3A5F', borderTopColor: bright ? '#2563EB' : '#42A5F5' }} />
                </div>
              ) : weekly.hrts.length === 0 ? (
                <div className="text-center py-10 text-xs" style={{ color: bright ? '#94A3B8' : '#475569' }}>
                  No weekly call data available
                </div>
              ) : (
                <>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-4 text-[10px]" style={{ color: bright ? '#64748B' : '#475569' }}>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#22C55E' }} /> Connected</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#EF4444' }} /> Not Connected</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#60A5FA' }} /> Other</span>
                    <span className="flex items-center gap-1.5 ml-2">
                      <AlertTriangle className="w-3 h-3" style={{ color: '#EF4444' }} />
                      Red border = ≥5 missed calls today
                    </span>
                  </div>
                  {/* HRT grid — 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {weekly.hrts.map(hrt => (
                      <WeeklyCard key={hrt.hrt_code} hrt={hrt} maxDay={maxDay} bright={bright} />
                    ))}
                  </div>
                  {/* Weekly totals row */}
                  <div className="mt-4 rounded-xl px-5 py-3 flex flex-wrap gap-5"
                    style={{
                      background: bright ? '#F0F9FF' : 'rgba(37,99,235,0.08)',
                      border:     bright ? '1px solid #BFDBFE' : '1px solid rgba(37,99,235,0.25)',
                    }}>
                    <span className="text-[11px] font-bold" style={{ color: bright ? '#1D4ED8' : '#60A5FA' }}>
                      Week Totals (all HRTs)
                    </span>
                    {[
                      ['Total Calls', weekly.hrts.reduce((s, h) => s + h.week_attempted, 0), '#60A5FA'],
                      ['Connected',   weekly.hrts.reduce((s, h) => s + h.week_connected, 0), '#22C55E'],
                      ['Not Connected', weekly.hrts.reduce((s, h) => s + h.week_not_connected, 0), '#EF4444'],
                    ].map(([label, val, color]) => (
                      <span key={label} className="text-[11px]" style={{ color: bright ? '#475569' : '#94A3B8' }}>
                        {label}: <strong style={{ color }}>{val}</strong>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {drill && (
        <DrillModal
          hrtCode={drill.hrtCode} hrtName={drill.hrtName}
          status={drill.status}  date={tab === 'daily' ? date : ''}
          role={user.role}       onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}
