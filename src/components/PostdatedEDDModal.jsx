import React, { useEffect, useState, useMemo } from 'react';
import { X, Search, AlertTriangle, ChevronUp, ChevronDown, Filter } from 'lucide-react';

const API = '/api';

const RISK_BADGE = {
  Critical:    { bg: 'rgba(239,68,68,0.15)',  color: '#FCA5A5', border: 'rgba(239,68,68,0.3)'  },
  'Very High': { bg: 'rgba(249,115,22,0.15)', color: '#FDBA74', border: 'rgba(249,115,22,0.3)' },
  High:        { bg: 'rgba(234,179,8,0.15)',  color: '#FDE047', border: 'rgba(234,179,8,0.3)'  },
  Moderate:    { bg: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: 'rgba(59,130,246,0.3)' },
  Low:         { bg: 'rgba(34,197,94,0.15)',  color: '#86EFAC', border: 'rgba(34,197,94,0.3)'  },
};

const CALL_BADGE = {
  'Connected':    { color: '#86EFAC', bg: 'rgba(34,197,94,0.12)'  },
  'Not Reachable':{ color: '#FDBA74', bg: 'rgba(249,115,22,0.12)' },
  'No Call':      { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)'},
};

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3" style={{ color: '#42A5F5' }} />
    : <ChevronDown className="w-3 h-3" style={{ color: '#42A5F5' }} />;
}

export default function PostdatedEDDModal({ user, onClose, openPatient }) {
  const [mothers,  setMothers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [phcFilter,setPhcFilter]= useState('');
  const [hrtFilter,setHrtFilter]= useState('');
  const [riskFilter,setRiskFilter]=useState('');
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
  const hrtOptions  = useMemo(() => [...new Set(mothers.map(m => m.hrt_name))].sort(),    [mothers]);
  const riskOptions = useMemo(() => ['Critical','Very High','High','Moderate','Low'],       []);

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
    if (riskFilter) list = list.filter(m => m.risk_category === riskFilter);

    list = [...list].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
    return list;
  }, [mothers, search, phcFilter, hrtFilter, riskFilter, sortCol, sortDir]);

  const Th = ({ col, label, right }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      style={{ color: sortCol === col ? '#42A5F5' : 'var(--ccmc-text-sec)', background: 'var(--ccmc-surface)', position: 'sticky', top: 0, zIndex: 1 }}
    >
      <span className="inline-flex items-center gap-1">
        {label} <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(6px)' }}>

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
              style={{ background: 'rgba(239,68,68,0.15)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--ccmc-text)', fontFamily: 'Poppins,sans-serif' }}>
                Postdated EDD — Mothers
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--ccmc-text-hint)' }}>
                Mothers whose Expected Delivery Date has passed but delivery is not yet recorded
                {!loading && <span className="ml-2 font-bold" style={{ color: '#EF4444' }}>
                  {filtered.length} of {mothers.length} mothers
                </span>}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
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
              onFocus={e => e.target.style.borderColor = '#1976D2'}
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

          {/* Risk filter */}
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
            className="px-2 py-2 rounded-lg text-xs outline-none"
            style={{ background: 'var(--ccmc-panel)', border: '1px solid var(--ccmc-border)', color: 'var(--ccmc-text)', minWidth: 130 }}>
            <option value="">All Risk Levels</option>
            {riskOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {(search || phcFilter || hrtFilter || riskFilter) && (
            <button onClick={() => { setSearch(''); setPhcFilter(''); setHrtFilter(''); setRiskFilter(''); }}
              className="px-2 py-2 rounded-lg text-[10px] font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
              Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--ccmc-border)', borderTopColor: '#EF4444' }} />
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
                  <Th col="risk_category"      label="Risk" />
                  <Th col="call_status"        label="Call Status" />
                  <Th col="followup_status"    label="Follow-Up" />
                  <Th col="last_followup_date" label="Last Follow-Up" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => {
                  const rb = RISK_BADGE[m.risk_category] || RISK_BADGE.Low;
                  const cb = CALL_BADGE[m.call_status]  || CALL_BADGE['No Call'];
                  return (
                    <tr key={m.uid}
                      onClick={() => { openPatient(m.uid); }}
                      className="cursor-pointer transition-all"
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(15,76,129,0.04)',
                        borderBottom: '1px solid var(--ccmc-border)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(25,118,210,0.08)'}
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
                        <span className="text-[10px]" style={{ color: m.cell_no ? 'var(--ccmc-text-sec)' : '#EF4444' }}>
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
                          style={{ background: 'rgba(66,165,245,0.12)', color: '#93C5FD' }}>
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
                        <span className="text-[10px] font-mono" style={{ color: '#FDBA74' }}>{m.edd || '—'}</span>
                      </td>

                      {/* Days Past EDD */}
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: m.days_past_edd > 30 ? 'rgba(239,68,68,0.18)' : 'rgba(249,115,22,0.15)',
                            color:      m.days_past_edd > 30 ? '#FCA5A5' : '#FDBA74',
                          }}>
                          {m.days_past_edd}d
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="px-3 py-2.5">
                        {m.risk_category ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: rb.bg, color: rb.color, border: `1px solid ${rb.border}` }}>
                            {m.risk_category}
                          </span>
                        ) : <span style={{ color: 'var(--ccmc-text-hint)' }}>—</span>}
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
                        <span className="text-[9px]" style={{ color: m.followup_status === 'No Follow-Up' ? '#94A3B8' : '#86EFAC' }}>
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
            <span>Showing <b style={{ color: 'var(--ccmc-text)' }}>{filtered.length}</b> mothers · Sorted by <b style={{ color: '#42A5F5' }}>{sortCol.replace(/_/g,' ')}</b> ({sortDir})</span>
            <span>Click any row to view full patient details</span>
          </div>
        )}
      </div>
    </div>
  );
}
