import React, { useState, useCallback, useEffect } from 'react';
import { Phone, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';

const API = '/api';

const HRT_COLORS = {
  HRT1: '#F472B6', HRT2: '#A78BFA', HRT3: '#60A5FA',
  HRT4: '#FBBF24', HRT5: '#34D399', HRT6: '#F87171',
  HRT7: '#C084FC', HRT8: '#FB923C',
};

const STAT_COLS = [
  { key: 'total_mothers',     label: 'Assigned',       color: '#93C5FD', drillStatus: null       },
  { key: 'calls_attempted',   label: 'Attempted',      color: '#60A5FA', drillStatus: ''         },
  { key: 'calls_connected',   label: 'Connected',      color: '#22C55E', drillStatus: 'Connected'},
  { key: 'no_response',       label: 'No Response',    color: '#EF4444', drillStatus: 'No Response'},
  { key: 'switched_off',      label: 'Switched Off',   color: '#94A3B8', drillStatus: 'Switched Off'},
  { key: 'wrong_number',      label: 'Wrong No.',      color: '#F97316', drillStatus: 'Wrong Number'},
  { key: 'call_back_later',   label: 'Call Back',      color: '#60A5FA', drillStatus: 'Call Back Later'},
  { key: 'followup_required', label: 'Follow-Up Req.', color: '#A78BFA', drillStatus: 'Follow-Up Required'},
  { key: 'resolved',          label: 'Resolved',       color: '#34D399', drillStatus: 'Resolved' },
  { key: 'calls_pending',     label: 'Pending',        color: '#64748B', drillStatus: 'Pending'  },
  { key: 'followups_due',     label: 'FU Due',         color: '#F59E0B', drillStatus: null       },
];

const STATUS_COLORS = {
  'Connected':          '#22C55E', 'No Response':      '#EF4444',
  'Switched Off':       '#94A3B8', 'Wrong Number':     '#F97316',
  'Call Back Later':    '#60A5FA', 'Follow-Up Required':'#A78BFA',
  'Resolved':           '#34D399', 'Pending':          '#64748B',
  'No Number':          '#EF4444',
};

/* ── Drill-down modal: shows mother list for HRT + status ── */
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

  const title = status
    ? `${hrtName} — ${status}`
    : `${hrtName} — All Call Attempts`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-5xl rounded-2xl flex flex-col" style={{ maxHeight: '88vh', background: 'var(--ccmc-panel)', border: '1px solid rgba(30,58,95,0.9)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(30,58,95,0.7)' }}>
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {rows.length} mothers · {date || 'All dates'}
            </p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">No records found</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mother Name</th><th>PHC</th><th>Phone</th>
                  <th>Call Status</th><th>Call Date</th><th>Call Time</th>
                  <th>Caller</th><th>Remarks</th><th>Next Follow-Up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.uid}>
                    <td>
                      <div className="font-semibold text-white max-w-[160px] truncate">{r.mother_name || '—'}</div>
                      <div className="text-[9px] text-slate-500">{r.rch_id || ''}</div>
                    </td>
                    <td className="text-xs text-slate-400">{r.phc_display}</td>
                    <td className="text-xs text-slate-400">{r.cell_no || '—'}</td>
                    <td>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${STATUS_COLORS[r.call_status] || '#94A3B8'}18`,
                          color:       STATUS_COLORS[r.call_status] || '#94A3B8',
                          border:     `1px solid ${STATUS_COLORS[r.call_status] || '#94A3B8'}30`,
                        }}>
                        {r.call_status || 'Pending'}
                      </span>
                    </td>
                    <td className="text-[10px] text-slate-400">{r.last_call_date || '—'}</td>
                    <td className="text-[10px] text-slate-400">{r.last_call_time || '—'}</td>
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

/* ── Main component ── */
export default function HRTCallPerformance({ user, defaultDate }) {
  const today = new Date().toISOString().slice(0, 10);
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [date,     setDate]     = useState(defaultDate || today);
  const [drill,    setDrill]    = useState(null); // { hrtCode, hrtName, status }
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ role: user.role });
    if (date) p.set('date', date);
    fetch(`${API}/hrt-call-performance?${p}`)
      .then(r => r.json())
      .then(d => { setData(d.hrts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.role, date]);

  useEffect(() => { load(); }, [load]);

  const openDrill = (hrt, col) => {
    if (col.drillStatus === null) return; // non-drillable (total_mothers, followups_due)
    setDrill({ hrtCode: hrt.hrt_code, hrtName: hrt.hrt_name, status: col.drillStatus });
  };

  /* Summary totals across all HRTs */
  const totals = STAT_COLS.reduce((acc, c) => {
    acc[c.key] = data.reduce((s, h) => s + (h[c.key] || 0), 0);
    return acc;
  }, {});

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: 'var(--ccmc-panel)', border: '1px solid rgba(66,165,245,0.35)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'rgba(30,58,95,0.7)' }}>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: '#42A5F5' }} />
          <h2 className="text-sm font-bold text-white">HRT Daily Call Activity</h2>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-1"
            style={{ background: 'rgba(66,165,245,0.15)', color: '#42A5F5' }}>LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 hidden md:block">click any count to see mothers</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-2 py-1 rounded text-xs text-white outline-none"
            style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,58,95,0.7)', colorScheme: 'dark' }} />
          <button onClick={load} disabled={loading}
            className="p-1.5 rounded transition-all"
            style={{ background: 'rgba(25,118,210,0.2)', color: '#42A5F5' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Summary strip */}
          {data.length > 0 && (
            <div className="grid px-5 py-2.5 border-b gap-2"
              style={{ borderColor: 'rgba(30,58,95,0.5)', gridTemplateColumns: `repeat(${STAT_COLS.length}, minmax(0,1fr))` }}>
              {STAT_COLS.map(c => (
                <div key={c.key} className="text-center">
                  <div className="text-sm font-bold" style={{ color: c.color }}>{totals[c.key] ?? 0}</div>
                  <div className="text-[8px] text-slate-600 uppercase tracking-wide">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: '#1E3A5F', borderTopColor: '#42A5F5' }} />
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No call data for selected date</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(30,58,95,0.5)' }}>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">HRT</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">PHCs</th>
                    {STAT_COLS.map(c => (
                      <th key={c.key} className="text-center px-2 py-2.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: c.color }}>
                        {c.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Last Call</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(hrt => {
                    const hrtColor = HRT_COLORS[hrt.hrt_code] || '#42A5F5';
                    return (
                      <tr key={hrt.hrt_code}
                        style={{ borderBottom: '1px solid rgba(30,58,95,0.3)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(25,118,210,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: `${hrtColor}20`, color: hrtColor }}>
                              {hrt.hrt_code}
                            </span>
                            <span className="text-xs font-semibold text-white whitespace-nowrap">{hrt.hrt_name}</span>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="text-[9px] text-slate-500 max-w-[200px] leading-relaxed">
                            {hrt.phcs.join(' · ')}
                          </div>
                        </td>

                        {STAT_COLS.map(c => {
                          const val = hrt[c.key] ?? 0;
                          const isDrillable = c.drillStatus !== null;
                          return (
                            <td key={c.key} className="px-2 py-3 text-center">
                              {isDrillable ? (
                                <button
                                  onClick={() => openDrill(hrt, c)}
                                  className="text-sm font-bold px-2 py-0.5 rounded transition-all min-w-[32px]"
                                  style={{ color: c.color, background: `${c.color}12`, cursor: 'pointer' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = `${c.color}28`; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = `${c.color}12`; e.currentTarget.style.transform = 'scale(1)'; }}>
                                  {val}
                                </button>
                              ) : (
                                <span className="text-sm font-bold" style={{ color: c.color }}>{val}</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-3 py-3">
                          <div className="text-[10px] text-slate-500 whitespace-nowrap">
                            {hrt.last_call_date
                              ? <><span>{hrt.last_call_date}</span>{hrt.last_call_time && <span className="ml-1 text-slate-600">{hrt.last_call_time}</span>}</>
                              : <span className="text-slate-700">—</span>
                            }
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

      {drill && (
        <DrillModal
          hrtCode={drill.hrtCode}
          hrtName={drill.hrtName}
          status={drill.status}
          date={date}
          role={user.role}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}
