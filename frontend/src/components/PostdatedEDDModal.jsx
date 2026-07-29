import React, { useEffect, useState, useMemo } from 'react';
import { X, Search, AlertTriangle, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API = '/api';

const CALL_BADGE = {
  'Connected':    { color: 'var(--ccmc-pill-success-text)', bg: 'var(--ccmc-pill-success-bg)' },
  'Not Reachable':{ color: 'var(--ccmc-pill-warning-text)', bg: 'var(--ccmc-pill-warning-bg)' },
  'No Call':      { color: 'var(--ccmc-pill-neutral-text)', bg: 'var(--ccmc-pill-neutral-bg)' },
};

const BRIGHT_SHADE = { '#3B82F6': '#1D4ED8', '#DC2626': '#DC2626', '#FCA5A5': '#DC2626', '#FDBA74': '#C2410C', '#93C5FD': '#1D4ED8', '#94A3B8': '#475569', '#86EFAC': '#15803D' };
function shade(hex, dark) { return dark ? hex : (BRIGHT_SHADE[hex] || hex); }

function SortIcon({ col, sortCol, sortDir }) {
  const { theme } = useTheme();
  const dark = theme !== 'bright';
  if (sortCol !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3" style={{ color: shade('#3B82F6', dark) }} />
    : <ChevronDown className="w-3 h-3" style={{ color: shade('#3B82F6', dark) }} />;
}

export default function PostdatedEDDModal({ user, onClose, openPatient }) {
  const { theme } = useTheme();
  const dark = theme !== 'bright';
  const [mothers,  setMothers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [phcFilter,setPhcFilter]= useState('');
  const [hrtFilter,setHrtFilter]= useState('');
  const [sortCol,  setSortCol]  = useState('days_past_edd');
  const [sortDir,  setSortDir]  = useState('desc');

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/postdated-edd?role=${user.role}`)
      .then(r => r.json())
      .then(d => { setMothers(d.mothers || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.role]);

  const phcOptions  = useMemo(() => [...new Set(mothers.map(m => m.phc_display))].sort(), [mothers]);
  const hrtOptions  = useMemo(() => [...new Set(mothers.map(m => m.hrt_name))].sort(), [mothers]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let list = mothers;
    const q = search.toLowerCase();
    if (q) list = list.filter(m =>
      m.mother_name.toLowerCase().includes(q) ||
      m.rch_id?.toString().includes(q) ||
      m.cell_no?.includes(q) ||
      m.phc_display?.toLowerCase().includes(q)
    );
    if (phcFilter)  list = list.filter(m => m.phc_display === phcFilter);
    if (hrtFilter)  list = list.filter(m => m.hrt_name    === hrtFilter);

    list = [...list].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
    return list;
  }, [mothers, search, phcFilter, hrtFilter, sortCol, sortDir]);

  const Th = ({ col, label, right }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      style={{ color: sortCol === col ? shade('#3B82F6', dark) : 'var(--ccmc-text-sec)', background: 'var(--ccmc-surface)', position: 'sticky', top: 0, zIndex: 1 }}
    >
      <span className="inline-flex items-center gap-1">
        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--ccmc-modal-backdrop)', backdropFilter: 'blur(6px)' }}>

      <div className="flex flex-col w-full max-w-7xl rounded-2xl overflow-hidden"
        style={{
          background: 'var(--ccmc-bg)',
          border: '1px solid var(--ccmc-border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'var(--ccmc-panel)', borderBottom: '1px solid var(--ccmc-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--ccmc-pill-critical-bg)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--ccmc-pill-critical-text)' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
                Postdated EDD — Mothers
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
                Mothers whose Expected Delivery Date has passed but delivery is not yet recorded
                {!loading && <span className="ml-2 font-bold" style={{ color: 'var(--ccmc-pill-critical-text)' }}>
                  {filtered.length} of {mothers.length} mothers
                </span>}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ background: 'var(--ccmc-pill-critical-bg)', color: 'var(--ccmc-pill-critical-text)', border: '1px solid rgba(220,38,38,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--ccmc-pill-critical-bg)'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Filters row ── */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ background: 'var(--ccmc-surface)', borderBottom: '1px solid var(--ccmc-border)' }}>

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ccmc-text-hint)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, mobile, PHC…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)', color: 'var(--ccmc-text)' }}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e  => e.target.style.borderColor = 'var(--ccmc-border)'}
            />
          </div>

          <Filter className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--ccmc-text-hint)' }} />

          {/* PHC filter */}
          <select value={phcFilter} onChange={e => setPhcFilter(e.target.value)}
            className="px-2 py-2 rounded-lg text-xs outline-none"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)', color: 'var(--ccmc-text)', minWidth: 140 }}>
            <option value="">All PHCs</option>
            {phcOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* HRT filter */}
          <select value={hrtFilter} onChange={e => setHrtFilter(e.target.value)}
            className="px-2 py-2 rounded-lg text-xs outline-none"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)', color: 'var(--ccmc-text)', minWidth: 130 }}>
            <option value="">All HRTs</option>
            {hrtOptions.map(h => <option key={h} value={h}>{h}</option>)}
          </select>

          {(search || phcFilter || hrtFilter) && (
            <button onClick={() => { setSearch(''); setPhcFilter(''); setHrtFilter(''); }}
              className="px-2 py-2 rounded-lg text-[10px] font-semibold"
              style={{ background: 'var(--ccmc-pill-critical-bg)', color: 'var(--ccmc-pill-critical-text)', border: '1px solid rgba(220,38,38,0.2)' }}>
              Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--ccmc-border)', borderTopColor: shade('#DC2626', dark) }} />
              <span className="ml-3 text-sm" style={{ color: 'var(--ccmc-text-hint)' }}>Loading postdated mothers…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertTriangle className="w-10 h-10" style={{ color: 'var(--ccmc-text-hint)' }} />
              <p className="text-sm" style={{ color: 'var(--ccmc-text-hint)' }}>
                {mothers.length === 0 ? 'No postdated EDD mothers found.' : 'No results match your filters.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th col="rch_id"            label="#ID" />
                  <Th col="mother_name"        label="Mother Name" />
                  <Th col="cell_no"            label="Mobile" />
                  <Th col="phc_display"        label="PHC" />
                  <Th col="hrt_name"           label="HRT" />
                  <Th col="hsc_name"           label="Staff Nurse / HSC" />
                  <Th col="edd"                label="EDD" />
                  <Th col="days_past_edd"      label="Days Past" right />
                  <Th col="call_status"        label="Call Status" />
                  <Th col="followup_status"    label="Follow-Up" />
                  <Th col="last_followup_date" label="Last Follow-Up" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => {
                  const cb = CALL_BADGE[m.call_status]  || CALL_BADGE['No Call'];
                  return (
                    <tr key={m.uid}
                      onClick={() => { openPatient(m.uid); }}
                      className="cursor-pointer transition-all"
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(15,76,129,0.04)',
                        borderBottom: '1px solid var(--ccmc-border)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(15,76,129,0.04)'}
                    >
                      {/* ID */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--ccmc-text-hint)' }}>
                          {m.rch_id || '—'}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-semibold" style={{ color: 'var(--ccmc-text)' }}>
                          {m.mother_name || '—'}
                        </div>
                        {m.address && (
                          <div className="text-[9px] truncate max-w-[160px]" style={{ color: 'var(--ccmc-text-hint)' }}>
                            {m.address}
                          </div>
                        )}
                      </td>

                      {/* Mobile */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px]" style={{ color: m.cell_no ? 'var(--ccmc-text-sec)' : shade('#DC2626', dark) }}>
                          {m.cell_no || 'No Phone'}
                        </span>
                      </td>

                      {/* PHC */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px]" style={{ color: 'var(--ccmc-text-sec)' }}>{m.phc_display}</span>
                      </td>

                      {/* HRT */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--ccmc-pill-info-bg)', color: 'var(--ccmc-pill-info-text)' }}>
                          {m.hrt_code}
                        </span>
                        <span className="text-[9px] ml-1" style={{ color: 'var(--ccmc-text-hint)' }}>{m.hrt_name}</span>
                      </td>

                      {/* Staff Nurse / HSC */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px]" style={{ color: 'var(--ccmc-text-sec)' }}>
                          {m.hsc_name || '—'}
                        </span>
                      </td>

                      {/* EDD */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--ccmc-pill-warning-text)' }}>{m.edd || '—'}</span>
                      </td>

                      {/* Days Past EDD */}
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: m.days_past_edd > 30 ? 'var(--ccmc-pill-critical-bg)' : 'var(--ccmc-pill-warning-bg)',
                            color:      m.days_past_edd > 30 ? 'var(--ccmc-pill-critical-text)' : 'var(--ccmc-pill-warning-text)',
                          }}>
                          {m.days_past_edd}d
                        </span>
                      </td>


                      {/* Call Status */}
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: cb.bg, color: cb.color }}>
                          {m.call_status}
                        </span>
                        {m.last_call_date && (
                          <div className="text-[8px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>{m.last_call_date}</div>
                        )}
                      </td>

                      {/* Follow-Up */}
                      <td className="px-3 py-2.5">
                        <span className="text-[9px]" style={{ color: m.followup_status === 'No Follow-Up' ? shade('#94A3B8', dark) : shade('#86EFAC', dark) }}>
                          {m.followup_status}
                        </span>
                      </td>

                      {/* Last Follow-Up Date */}
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--ccmc-text-hint)' }}>
                          {m.last_followup_date || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 text-[10px]"
            style={{ background: 'var(--ccmc-surface)', borderTop: '1px solid var(--ccmc-border)', color: 'var(--ccmc-text-hint)' }}>
            <span>Showing <b style={{ color: 'var(--ccmc-text)' }}>{filtered.length}</b> mothers · Sorted by <b style={{ color: shade('#3B82F6', dark) }}>{sortCol.replace(/_/g,' ')}</b> ({sortDir})</span>
            <span>Click any row to view full patient details</span>
          </div>
        )}
      </div>
    </div>
  );
}
